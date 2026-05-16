import axios from 'axios';
import crypto from 'crypto';
import { URLS, HEADERS, AE, GARENA_CLIENT } from './constants';
import { CredentialManager } from './credential-manager';
import { protoHandler } from './protobuf';
import type { LikeResult, GarenaTokenResponse, MajorLoginResponse } from '@/types';
import { getErrorMessage } from '@/types';

/**
 * API client for sending profile likes to a target Free Fire player.
 * Manages guest credential pools per region and rotates through them.
 */
export class LikeAPI {
  private credentialManagers: Record<string, CredentialManager> = {};

  private _getCredentialManager(region: string): CredentialManager {
    if (!this.credentialManagers[region]) {
      this.credentialManagers[region] = new CredentialManager(region);
    }
    return this.credentialManagers[region];
  }

  private _getBaseUrl(region: string): string {
    const regionUpper = region.toUpperCase();
    if (regionUpper === 'IND') return 'https://client.ind.freefiremobile.com';
    if (['BR', 'US', 'SAC', 'NA'].includes(regionUpper)) return 'https://client.us.freefiremobile.com';
    return 'https://clientbp.ggblueshark.com';
  }

  private async _login(uid: string, password: string): Promise<{ jwt: string; serverUrl: string; accountId: string } | null> {
    try {
      const params = new URLSearchParams();
      params.append('uid', uid);
      params.append('password', password);
      params.append('response_type', 'token');
      params.append('client_type', '2');
      params.append('client_secret', GARENA_CLIENT.CLIENT_SECRET);
      params.append('client_id', GARENA_CLIENT.CLIENT_ID);

      const tokenResponse = await axios.post<GarenaTokenResponse>(URLS.GARENA_TOKEN, params, { headers: HEADERS.GARENA_AUTH });
      if (!tokenResponse.data?.access_token) return null;

      const accessToken = tokenResponse.data.access_token;
      const openId = tokenResponse.data.open_id;

      const loginPayload = { openid: openId, logintoken: accessToken, platform: '4' };
      const encryptedBody = await protoHandler.encode('MajorLogin.proto', 'request', loginPayload, true);

      const loginResponse = await axios.post(URLS.MAJOR_LOGIN, encryptedBody, {
        headers: {
          ...HEADERS.COMMON,
          Authorization: 'Bearer',
          'Content-Type': 'application/octet-stream'
        },
        responseType: 'arraybuffer'
      });

      const loginData = await protoHandler.decode('MajorLogin.proto', 'response', loginResponse.data);
      if (loginData && typeof loginData === 'object' && 'token' in loginData) {
        const decoded = loginData as MajorLoginResponse;
        return {
          jwt: decoded.token,
          serverUrl: decoded.serverUrl || '',
          accountId: decoded.accountid
        };
      }
      return null;
    } catch (error) {
      console.log(`[LikeAPI] Login error: ${getErrorMessage(error)}`);
      return null;
    }
  }

  private _createLikePayload(targetUid: string, region: string): Buffer {
    const fields: Buffer[] = [];

    const targetBytes = Buffer.from(targetUid, 'utf8');
    fields.push(Buffer.concat([Buffer.from([0x0a, targetBytes.length]), targetBytes]));

    const regionBytes = Buffer.from(region, 'utf8');
    fields.push(Buffer.concat([Buffer.from([0x12, regionBytes.length]), regionBytes]));

    const payload = Buffer.concat(fields);
    const { encrypt } = require('./crypto');
    return encrypt(payload);
  }

  private async _sendLikeWithGuest(guest: { uid: string; password: string }, targetUid: string, region: string): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = await this._login(guest.uid, guest.password);
      if (!auth) return { success: false, error: 'Login failed' };

      const serverUrl = auth.serverUrl || this._getBaseUrl(region);
      const payload = this._createLikePayload(targetUid, region);
      const headers = {
        'User-Agent': HEADERS.COMMON['User-Agent'],
        Connection: HEADERS.COMMON['Connection'],
        'Accept-Encoding': HEADERS.COMMON['Accept-Encoding'],
        'Content-Type': 'application/octet-stream',
        Expect: HEADERS.COMMON['Expect'],
        Authorization: `Bearer ${auth.jwt}`,
        'X-Unity-Version': HEADERS.COMMON['X-Unity-Version'],
        'X-GA': HEADERS.COMMON['X-GA'],
        ReleaseVersion: HEADERS.COMMON['ReleaseVersion']
      };

      const response = await axios.post(`${serverUrl}/LikeProfile`, payload, {
        headers,
        timeout: 30000,
        responseType: 'arraybuffer'
      });

      if (response.status === 200) return { success: true };
      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Sends likes to a target player using available guest accounts.
   * @param targetUid - UID of the player to receive likes.
   * @param region - Region code (e.g., 'IND', 'BR').
   * @param likeCount - Number of likes to send (default 100, max 100 per day).
   * @returns Summary of the like operation including success and failure counts.
   */
  async sendLikes(targetUid: string, region: string, likeCount = 100): Promise<LikeResult> {
    const cm = this._getCredentialManager(region);
    const availableCount = cm.getAvailableCount(targetUid);
    console.log(`[LikeAPI] Available guests for ${targetUid}: ${availableCount}/${cm.getPoolSize()}`);

    const maxDaily = 100;
    const requestedLikes = Math.min(likeCount, maxDaily);
    const plannedLikes = Math.min(requestedLikes, availableCount);

    if (plannedLikes === 0) {
      return {
        success: false,
        message: 'No available guests left for this target. All guests have been used.',
        successCount: 0,
        failedCount: 0,
        remainingGuests: 0
      };
    }

    console.log(`[LikeAPI] Planning to send ${plannedLikes} likes to ${targetUid} using ${region} guests`);
    const guests = cm.getMultipleForTarget(targetUid, plannedLikes);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      process.stdout.write(`[LikeAPI] Progress: ${i + 1}/${guests.length} (${successCount}✓ ${failedCount}✗)\r`);

      const result = await this._sendLikeWithGuest(guest, targetUid, region);
      if (result.success) {
        successCount++;
        cm.markUsed(targetUid, guest.uid);
      } else {
        failedCount++;
        console.log(`\n[LikeAPI] Guest ${guest.uid} failed: ${result.error}`);
      }

      if (i < guests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n[LikeAPI] Completed: ${successCount}/${guests.length} likes sent successfully`);

    return {
      success: successCount > 0,
      successCount,
      failedCount,
      remainingGuests: cm.getAvailableCount(targetUid),
      message: `Sent ${successCount} likes to ${targetUid}. ${cm.getAvailableCount(targetUid)} guests remaining.`
    };
  }
}
