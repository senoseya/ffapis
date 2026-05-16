import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { AEConfig, HeadersConfig, URLSConfig, GarenaClientConfig, Settings } from '@/types';

function loadYamlFile(filePath: string): Record<string, string> {
  try {
    const yamlRaw = fs.readFileSync(filePath, 'utf8');
    return yaml.load(yamlRaw) as Record<string, string>;
  } catch {
    return {};
  }
}

function readConfigValue(config: Record<string, string>, key: string, fallback?: string): string {
  const value = config[key];
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required setting in config/settings.yaml: ${key}`);
  }
  return String(value);
}

function requireConfigValue(config: Record<string, string>, key: string): string {
  return readConfigValue(config, key);
}

function findSettingsPath(): string {
  const candidates = [
    path.join(__dirname, '../../config/settings.yaml'),
    path.join(__dirname, '../config/settings.yaml'),
    path.join(process.cwd(), 'config/settings.yaml')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

function loadSettings(): Settings {
  const parsed = loadYamlFile(findSettingsPath());

  return {
    AE: {
      MAIN_KEY: Buffer.from(requireConfigValue(parsed, 'AE_MAIN_KEY'), 'binary'),
      MAIN_IV: Buffer.from(requireConfigValue(parsed, 'AE_MAIN_IV'), 'binary')
    },
    HEADERS: {
      COMMON: {
        'User-Agent': requireConfigValue(parsed, 'HEADERS_COMMON_USER_AGENT'),
        'Connection': requireConfigValue(parsed, 'HEADERS_COMMON_CONNECTION'),
        'Accept-Encoding': requireConfigValue(parsed, 'HEADERS_COMMON_ACCEPT_ENCODING'),
        'Expect': requireConfigValue(parsed, 'HEADERS_COMMON_EXPECT'),
        'X-Unity-Version': requireConfigValue(parsed, 'HEADERS_COMMON_X_UNITY_VERSION'),
        'X-GA': requireConfigValue(parsed, 'HEADERS_COMMON_X_GA'),
        'ReleaseVersion': requireConfigValue(parsed, 'HEADERS_COMMON_RELEASE_VERSION'),
        'Content-Type': requireConfigValue(parsed, 'HEADERS_COMMON_CONTENT_TYPE')
      },
      GARENA_AUTH: {
        'User-Agent': requireConfigValue(parsed, 'HEADERS_GARENA_AUTH_USER_AGENT'),
        'Connection': requireConfigValue(parsed, 'HEADERS_GARENA_AUTH_CONNECTION'),
        'Accept-Encoding': requireConfigValue(parsed, 'HEADERS_GARENA_AUTH_ACCEPT_ENCODING')
      }
    },
    URLS: {
      GARENA_TOKEN: requireConfigValue(parsed, 'URL_GARENA_TOKEN'),
      GUEST_REGISTER: requireConfigValue(parsed, 'URL_GUEST_REGISTER'),
      MAJOR_LOGIN: requireConfigValue(parsed, 'URL_MAJOR_LOGIN'),
      MAJOR_REGISTER: requireConfigValue(parsed, 'URL_MAJOR_REGISTER'),
      SEARCH: (serverUrl: string) => `${serverUrl}${requireConfigValue(parsed, 'URL_PATH_SEARCH')}`,
      PERSONAL_SHOW: (serverUrl: string) => `${serverUrl}${requireConfigValue(parsed, 'URL_PATH_PERSONAL_SHOW')}`,
      PLAYER_STATS: (serverUrl: string) => `${serverUrl}${requireConfigValue(parsed, 'URL_PATH_PLAYER_STATS')}`,
      PLAYER_CS_STATS: (serverUrl: string) => `${serverUrl}${requireConfigValue(parsed, 'URL_PATH_PLAYER_CS_STATS')}`
    },
    GARENA_CLIENT: {
      CLIENT_ID: requireConfigValue(parsed, 'GARENA_CLIENT_ID'),
      CLIENT_SECRET: requireConfigValue(parsed, 'GARENA_CLIENT_SECRET')
    }
  };
}

const settings = loadSettings();
const paths = settings.URLS;

export const AE: AEConfig = settings.AE;
export const HEADERS: HeadersConfig = settings.HEADERS;
export const URLS: URLSConfig = {
  GARENA_TOKEN: paths.GARENA_TOKEN,
  GUEST_REGISTER: paths.GUEST_REGISTER,
  MAJOR_LOGIN: paths.MAJOR_LOGIN,
  MAJOR_REGISTER: paths.MAJOR_REGISTER,
  SEARCH: paths.SEARCH,
  PERSONAL_SHOW: paths.PERSONAL_SHOW,
  PLAYER_STATS: paths.PLAYER_STATS,
  PLAYER_CS_STATS: paths.PLAYER_CS_STATS
};
export const GARENA_CLIENT: GarenaClientConfig = settings.GARENA_CLIENT;
