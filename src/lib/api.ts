import axios from 'axios';
import crypto from 'crypto';
import { protoHandler } from './protobuf';
import { AE, HEADERS, URLS, GARENA_CLIENT } from './constants';
import { processPlayerItems } from './utils';
import { CredentialManager } from './credential-manager';
import fs from 'fs';
import path from 'path';
import type { Session, GarenaTokenResponse, GarenaGuestRegisterResponse, MajorLoginResponse, SearchResult, RegisterResult, ProcessedPlayerItems, PlayerProfile, PlayerStats } from '@/types';
import { getErrorMessage } from '@/types';
import { resolveProjectDir } from './resolve-path';

/**
 * Main API client for interacting with the Free Fire game servers.
 * Handles authentication, player lookup, stats retrieval, and account registration.
 */
export class FreeFireAPI {
  public session: Session;
  public region: string | null;
  public credentialManager: CredentialManager | null;
  private allCredentials: Array<{ uid: string; password: string }> | null = null;

  /**
   * Creates a new FreeFireAPI instance.
   * @param region - Optional region code (e.g., 'IND', 'BR') to scope credential lookup.
   */
  constructor(region: string | null = null) {
    this.session = { token: null, serverUrl: null, openId: null, accountId: null };
    this.region = region;
    this.credentialManager = region ? new CredentialManager(region) : null;
  }

  /**
   * Switches the active region and initializes a new credential manager.
   * @param region - Region code to switch to.
   */
  setRegion(region: string): void {
    this.region = region;
    this.credentialManager = new CredentialManager(region);
  }

  private _loadAllCredentials(): Array<{ uid: string; password: string }> {
    if (this.allCredentials) return this.allCredentials;

    const allCreds: Array<{ uid: string; password: string }> = [];
    const credentialsDir = resolveProjectDir('config/credentials');

    try {
      const files = fs.readdirSync(credentialsDir);
      for (const file of files) {
        if (file.endsWith('.yaml')) {
          const filePath = path.join(credentialsDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          let currentAccount: { uid: string; password: string } | null = null;

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- uid:')) {
              if (currentAccount) allCreds.push(currentAccount);
              const uidMatch = trimmed.match(/uid:\s*"([^"]+)"/);
              currentAccount = { uid: uidMatch ? uidMatch[1] : '', password: '' };
            } else if (trimmed.startsWith('password:') && currentAccount) {
              const pwdMatch = trimmed.match(/password:\s*"([^"]+)"/);
              if (pwdMatch) currentAccount.password = pwdMatch[1];
            }
          }

          if (currentAccount && currentAccount.password) allCreds.push(currentAccount);
        }
      }
    } catch (error) {
      console.error('[API] Failed to load all credentials:', getErrorMessage(error));
    }

    this.allCredentials = allCreds;
    console.log(`[API] Loaded ${allCreds.length} credentials from all regions`);
    return allCreds;
  }

  private _getRandomCredentialFromAll(): { uid: string; password: string } {
    const creds = this._loadAllCredentials();
    if (creds.length === 0) throw new Error('No credentials available in any region');
    const randomIndex = Math.floor(Math.random() * creds.length);
    return creds[randomIndex];
  }

  /**
   * Logs in using a random credential from any available region pool.
   * @returns A valid session containing token, server URL, and account details.
   */
  async loginWithRandomCredentialFromAll(): Promise<Session> {
    const cred = this._getRandomCredentialFromAll();
    console.log(`[API] Using random credential from all regions: ${cred.uid}`);
    return this.login(cred.uid, cred.password);
  }

  /**
   * Logs in using a random credential from the currently set region pool.
   * Falls back to all-region lookup if no region is configured.
   * @returns A valid session containing token, server URL, and account details.
   */
  async loginWithRandomCredential(): Promise<Session> {
    if (!this.credentialManager) {
      return this.loginWithRandomCredentialFromAll();
    }
    const cred = this.credentialManager.getRandomCredential();
    if (!cred) throw new Error(`No credentials available in pool for region ${this.region}`);
    console.log(`[API] Using random credential from ${this.region}: ${cred.uid}`);
    return this.login(cred.uid, cred.password);
  }

  /**
   * Authenticates with a specific UID and password.
   * @param uid - Garena account UID.
   * @param password - Account password.
   * @returns A valid session containing token, server URL, and account details.
   */
  async login(uid: string, password: string): Promise<Session> {
    if (!uid || !password) throw new Error('Missing credentials. Please provide UID and PASSWORD to login(uid, password).');

    const garenaData = await this._getGarenaToken(uid, password);
    if (!garenaData?.access_token) throw new Error('Garena authentication failed: Invalid credentials or response');

    const loginData = await this._majorLogin(garenaData.access_token, garenaData.open_id);
    if (!loginData?.token) throw new Error('Major login failed: Empty token received');

    this.session.token = loginData.token;
    this.session.serverUrl = loginData.serverUrl;
    this.session.openId = garenaData.open_id;
    this.session.accountId = loginData.accountid;

    return this.session;
  }

  private async _getGarenaToken(uid: string, password: string): Promise<GarenaTokenResponse> {
    const params = new URLSearchParams();
    params.append('uid', uid);
    params.append('password', password);
    params.append('response_type', 'token');
    params.append('client_type', '2');
    params.append('client_secret', GARENA_CLIENT.CLIENT_SECRET);
    params.append('client_id', GARENA_CLIENT.CLIENT_ID);

    try {
      const response = await axios.post<GarenaTokenResponse>(URLS.GARENA_TOKEN, params, { headers: HEADERS.GARENA_AUTH, timeout: 30000 });
      return response.data;
    } catch (error) {
      throw new Error(`Garena Auth Request Failed: ${getErrorMessage(error)}`);
    }
  }

  private async _majorLogin(accessToken: string, openId: string): Promise<MajorLoginResponse> {
    const payload = { openid: openId, logintoken: accessToken, platform: '4' };
    const encryptedBody = await protoHandler.encode('MajorLogin.proto', 'request', payload, true);

    try {
      const response = await axios.post(URLS.MAJOR_LOGIN, encryptedBody, {
        headers: {
          ...HEADERS.COMMON,
          Authorization: 'Bearer',
          'Content-Type': 'application/octet-stream'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });
      const decoded = await protoHandler.decode('MajorLogin.proto', 'response', response.data);
      return decoded as MajorLoginResponse;
    } catch (error) {
      throw new Error(`Major Login Request Failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Searches for players by nickname across Free Fire servers.
   * @param keyword - Player nickname to search (minimum 3 characters).
   * @returns Array of matching player results.
   */
  async searchAccount(keyword: string): Promise<SearchResult[]> {
    if (!this.session.token) await this.loginWithRandomCredential();
    if (keyword.length < 3) throw new Error('Search keyword must be at least 3 characters long.');

    const payload = { keyword: String(keyword) };
    const encryptedBody = await protoHandler.encode('SearchAccountByName.proto', 'SearchAccountByName.request', payload, true);
    const url = URLS.SEARCH(this.session.serverUrl!);

    try {
      const response = await axios.post(url, encryptedBody, {
        headers: {
          ...HEADERS.COMMON,
          Authorization: `Bearer ${this.session.token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });
      const data = await protoHandler.decode('SearchAccountByName.proto', 'SearchAccountByName.response', response.data) as { infos?: SearchResult[] };
      return data.infos || [];
    } catch (error) {
      throw new Error(`Search Failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Retrieves detailed profile information for a player.
   * @param uid - Target player UID.
   * @returns Structured player profile including basic info, clan, and pet data.
   */
  async getPlayerProfile(uid: number | string): Promise<PlayerProfile> {
    return this._requestProfile(uid, false);
  }

  private async _requestProfile(uid: number | string, isRetry: boolean): Promise<PlayerProfile> {
    await this._checkSession();

    const payload = { accountId: Number(uid), callSignSrc: 7, needGalleryInfo: true };
    const encryptedBody = await protoHandler.encode('PlayerPersonalShow.proto', 'request', payload, true);
    const url = URLS.PERSONAL_SHOW(this.session.serverUrl!);

    try {
      const response = await axios.post(url, encryptedBody, {
        headers: { ...HEADERS.COMMON, Authorization: `Bearer ${this.session.token}` },
        responseType: 'arraybuffer',
        timeout: 30000
      });
      const decoded = await protoHandler.decode('PlayerPersonalShow.proto', 'response', response.data);
      return decoded as PlayerProfile;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : 0;
      if (!isRetry && (status === 400 || status === 401)) {
        this.session.token = null;
        await this._checkSession();
        return this._requestProfile(uid, true);
      }
      throw new Error(`Get Profile Failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Fetches and processes a player's equipped items (outfit, weapons, skills, pet).
   * @param uid - Target player UID.
   * @returns Normalized item details mapped from the internal items database.
   */
  async getPlayerItems(uid: number | string): Promise<ProcessedPlayerItems | null> {
    const profile = await this.getPlayerProfile(uid);
    if (!profile) return null;
    return processPlayerItems(profile);
  }

  /**
   * Retrieves match statistics for a player.
   * @param uid - Target player UID.
   * @param mode - Game mode: 'br' (Battle Royale) or 'cs' (Clash Squad).
   * @param matchType - Match type: 'career', 'ranked', or 'normal'.
   * @returns Structured stats object for solo, duo, and squad matches.
   */
  async getPlayerStats(uid: number | string, mode: 'br' | 'cs' = 'br', matchType: 'career' | 'ranked' | 'normal' = 'career'): Promise<PlayerStats> {
    if (!this.session.token) await this.loginWithRandomCredential();

    const modeLower = mode.toLowerCase();
    const typeUpper = matchType.toUpperCase();

    let matchMode = 0;
    let url = '';
    let protoFile = '';
    const payload: Record<string, number> = { accountid: Number(uid) };

    if (modeLower === 'br') {
      const types: Record<string, number> = { CAREER: 0, NORMAL: 1, RANKED: 2 };
      matchMode = types[typeUpper] !== undefined ? types[typeUpper] : 0;
      url = URLS.PLAYER_STATS(this.session.serverUrl!);
      protoFile = 'PlayerStats.proto';
      payload.matchmode = matchMode;
    } else {
      const types: Record<string, number> = { CAREER: 0, NORMAL: 1, RANKED: 6 };
      matchMode = types[typeUpper] !== undefined ? types[typeUpper] : 0;
      url = URLS.PLAYER_CS_STATS(this.session.serverUrl!);
      protoFile = 'PlayerCSStats.proto';
      payload.gamemode = 15;
      payload.matchmode = matchMode;
    }

    const encryptedBody = await protoHandler.encode(protoFile, 'request', payload, true);

    try {
      const response = await axios.post(url, encryptedBody, {
        headers: { ...HEADERS.COMMON, Authorization: `Bearer ${this.session.token}` },
        responseType: 'arraybuffer',
        timeout: 30000
      });
      const decoded = await protoHandler.decode(protoFile, 'response', response.data);
      return decoded as PlayerStats;
    } catch (error) {
      throw new Error(`Get Stats Failed: ${getErrorMessage(error)}`);
    }
  }

  private async _checkSession(): Promise<void> {
    if (!this.session.token || !this.session.serverUrl) {
      await this.loginWithRandomCredentialFromAll();
    }
  }

  /**
   * Registers a new guest account in the specified region.
   * @param region - Target region code (e.g., 'IND').
   * @param nickname - Optional nickname; a random one is generated if omitted.
   * @returns Registration result containing UID, password, and region.
   */
  async register(region: string, nickname: string | null = null): Promise<RegisterResult> {
    const password = this._generateRandomPassword();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex').toUpperCase();

    const uid = await this._guestRegister(passwordHash);
    if (!uid) throw new Error('Guest registration failed');

    const garenaData = await this._getGarenaTokenForRegister(uid, passwordHash);
    if (!garenaData?.access_token) throw new Error('Token grant failed after registration');

    const autoNickname = nickname || `senos${Math.floor(Math.random() * 9999) + 1}`;
    const registerData = await this._majorRegister(autoNickname, garenaData.access_token, garenaData.open_id, region);

    if (!registerData.success) throw new Error(`Major registration failed: ${registerData.error || 'Unknown error'}`);

    return { uid, password, passwordHash, region, nickname: autoNickname };
  }

  private _generateRandomPassword(): string {
    return String(Math.floor(Math.random() * 9000000000) + 1000000000);
  }

  private async _guestRegister(passwordHash: string): Promise<string | undefined> {
    const params = new URLSearchParams();
    params.append('password', passwordHash);
    params.append('client_type', '2');
    params.append('source', '2');
    params.append('app_id', GARENA_CLIENT.CLIENT_ID);

    const signature = crypto.createHmac('sha256', GARENA_CLIENT.CLIENT_SECRET).update(params.toString()).digest('hex');

    try {
      const response = await axios.post<GarenaGuestRegisterResponse>(URLS.GUEST_REGISTER, params, {
        headers: {
          ...HEADERS.GARENA_AUTH,
          Authorization: `Signature ${signature}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });
      return response.data.uid;
    } catch (error) {
      throw new Error(`Guest Register Failed: ${getErrorMessage(error)}`);
    }
  }

  private async _getGarenaTokenForRegister(uid: string, passwordHash: string): Promise<GarenaTokenResponse> {
    const params = new URLSearchParams();
    params.append('uid', uid);
    params.append('password', passwordHash);
    params.append('response_type', 'token');
    params.append('client_type', '2');
    params.append('client_secret', GARENA_CLIENT.CLIENT_SECRET);
    params.append('client_id', GARENA_CLIENT.CLIENT_ID);

    try {
      const response = await axios.post(URLS.GARENA_TOKEN, params, { headers: HEADERS.GARENA_AUTH, timeout: 30000 });
      return response.data;
    } catch (error) {
      throw new Error(`Token Grant Failed: ${getErrorMessage(error)}`);
    }
  }

  private _xorEncryptOpenId(openId: string): Buffer {
    const k = [0, 0, 0, 2, 0, 1, 7, 0, 0, 0, 0, 0, 2, 0, 1, 7, 0, 0, 0, 0, 0, 2, 0, 1, 7, 0, 0, 0, 0, 0, 2, 0];
    const bytes = Buffer.from(openId, 'utf8');
    const result = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      result[i] = bytes[i] ^ k[i % k.length] ^ 48;
    }
    return result;
  }

  private _encodeVarint(n: number): Buffer {
    const result: number[] = [];
    while (n > 0x7f) {
      result.push((n & 0x7f) | 0x80);
      n >>= 7;
    }
    result.push(n);
    return Buffer.from(result);
  }

  private _encodeField(fieldNum: number, value: number | string | Buffer): Buffer {
    if (typeof value === 'number' && Number.isInteger(value)) {
      const tag = (fieldNum << 3) | 0;
      const varint = this._encodeVarint(value);
      return Buffer.concat([this._encodeVarint(tag), varint]);
    }
    if (typeof value === 'string') {
      const bytes = Buffer.from(value, 'utf8');
      const tag = (fieldNum << 3) | 2;
      return Buffer.concat([this._encodeVarint(tag), this._encodeVarint(bytes.length), bytes]);
    }
    if (Buffer.isBuffer(value)) {
      const tag = (fieldNum << 3) | 2;
      return Buffer.concat([this._encodeVarint(tag), this._encodeVarint(value.length), value]);
    }
    throw new Error('Unsupported protobuf field type');
  }

  private _manualProtobufEncode(data: Record<number, number | string | Buffer>): Buffer {
    const parts: Buffer[] = [];
    const entries = Object.entries(data).sort((a, b) => Number(a[0]) - Number(b[0]));
    for (const [fieldNum, value] of entries) {
      parts.push(this._encodeField(Number(fieldNum), value));
    }
    return Buffer.concat(parts);
  }

  private async _majorRegister(nickname: string, accessToken: string, openId: string, region: string): Promise<{ success: boolean; error?: string }> {
    const encryptedOpenId = this._xorEncryptOpenId(openId);
    const payload: Record<number, number | string | Buffer> = {
      1: nickname,
      2: accessToken,
      3: openId,
      5: 102000007,
      6: 4,
      7: 1,
      13: 1,
      14: encryptedOpenId,
      15: region,
      16: 1
    };

    const protoBytes = this._manualProtobufEncode(payload);
    const { encrypt } = await import('./crypto');
    const encryptedBody = encrypt(protoBytes);

    try {
      const response = await axios.post(URLS.MAJOR_REGISTER, encryptedBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Unity-Version': '2018.4.11f1',
          'X-GA': 'v1 1',
          ReleaseVersion: 'OB53',
          'Content-Type': 'application/octet-stream',
          'User-Agent': HEADERS.GARENA_AUTH['User-Agent'],
          Host: 'loginbp.ggblueshark.com',
          Connection: 'Keep-Alive',
          'Accept-Encoding': 'gzip'
        },
        responseType: 'arraybuffer',
        validateStatus: () => true,
        timeout: 30000
      });

      if (response.status === 200) return { success: true };

      let errorDetail = `HTTP ${response.status}`;
      try {
        if (Buffer.isBuffer(response.data)) {
          errorDetail += ` | Response: ${response.data.toString('hex').substring(0, 100)}`;
        }
      } catch {
        // ignore
      }
      return { success: false, error: errorDetail };
    } catch (error) {
      return { success: false, error: `Request failed: ${getErrorMessage(error)}` };
    }
  }

  private _manualProtobufDecode(buffer: Buffer): Record<number, number | string> {
    const result: Record<number, number | string> = {};
    let offset = 0;

    while (offset < buffer.length) {
      let tag = 0;
      let shift = 0;
      while (true) {
        const byte = buffer[offset++];
        tag |= (byte & 0x7f) << shift;
        shift += 7;
        if ((byte & 0x80) === 0) break;
      }

      const fieldNum = tag >> 3;
      const wireType = tag & 0x07;

      if (wireType === 0) {
        let value = 0;
        shift = 0;
        while (true) {
          const byte = buffer[offset++];
          value |= (byte & 0x7f) << shift;
          shift += 7;
          if ((byte & 0x80) === 0) break;
        }
        result[fieldNum] = value;
      } else if (wireType === 2) {
        let length = 0;
        shift = 0;
        while (true) {
          const byte = buffer[offset++];
          length |= (byte & 0x7f) << shift;
          shift += 7;
          if ((byte & 0x80) === 0) break;
        }
        result[fieldNum] = buffer.slice(offset, offset + length).toString('utf8');
        offset += length;
      }
    }

    return result;
  }
}
