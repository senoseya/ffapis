export interface Session {
  token: string | null;
  serverUrl: string | null;
  openId: string | null;
  accountId: string | null;
}

export interface Credential {
  uid: string;
  password: string;
}

export interface GarenaTokenResponse {
  access_token: string;
  open_id: string;
}

export interface GarenaGuestRegisterResponse {
  uid: string;
}

export interface MajorLoginResponse {
  token: string;
  serverUrl: string;
  accountid: string;
}

export interface SearchResult {
  accountid: string;
  nickname: string;
  level: number;
}

export interface RegisterResult {
  uid: string;
  password: string;
  passwordHash: string;
  region: string;
  nickname: string;
}

export interface LikeResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  remainingGuests: number;
  message: string;
}

export interface AEConfig {
  MAIN_KEY: Buffer;
  MAIN_IV: Buffer;
}

export interface HeadersConfig {
  COMMON: Record<string, string>;
  GARENA_AUTH: Record<string, string>;
}

export interface URLSConfig {
  GARENA_TOKEN: string;
  GUEST_REGISTER: string;
  MAJOR_LOGIN: string;
  MAJOR_REGISTER: string;
  SEARCH: (serverUrl: string) => string;
  PERSONAL_SHOW: (serverUrl: string) => string;
  PLAYER_STATS: (serverUrl: string) => string;
  PLAYER_CS_STATS: (serverUrl: string) => string;
}

export interface GarenaClientConfig {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

export interface Settings {
  AE: AEConfig;
  HEADERS: HeadersConfig;
  URLS: URLSConfig;
  GARENA_CLIENT: GarenaClientConfig;
}

export interface ItemDetails {
  id: number;
  name: string;
  type: string;
  rarity: string;
  description: string;
  is_unique: boolean;
  image: string;
  image_fallback: string;
  collection_type?: string;
  icon_code?: string;
}

export interface PlayerBasicInfo {
  accountid: string;
  nickname: string;
  level: number;
  exp: number;
  region: string;
  liked: string;
  signature: string;
  createat: number;
  lastloginat: number;
  weaponskinshows: number[];
}

export interface PlayerClanInfo {
  clanname: string;
  clanid: string;
}

export interface PlayerPetInfo {
  id: number;
  name: string;
  level: number;
  skinid: number;
  selectedskillid: number;
}

export interface PlayerProfileInfo {
  clothes: number[];
  equipedskills: number[];
}

export interface PlayerProfile {
  basicinfo: PlayerBasicInfo;
  claninfo?: PlayerClanInfo;
  petinfo?: PlayerPetInfo;
  profileinfo: PlayerProfileInfo;
}

export interface PlayerStats {
  solostats?: Record<string, unknown>;
  duostats?: Record<string, unknown>;
  quadstats?: Record<string, unknown>;
}

export interface ProcessedPlayerItems {
  basic_info: {
    accountid: string;
    nickname: string;
    level: number;
    region: string;
    liked: string;
    signature: string;
  };
  items: {
    outfit: ItemDetails[];
    skills: { equipped: ItemDetails[] };
    weapons: { shown_skins: ItemDetails[] };
    pet: {
      id: ItemDetails;
      name: string;
      level: number;
      skin: ItemDetails;
      selected_skill: ItemDetails;
    } | null;
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}
