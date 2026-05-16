import fs from 'fs';
import type { ItemDetails, ProcessedPlayerItems, PlayerProfile } from '@/types';
import { getErrorMessage } from '@/types';
import { resolveProjectFile } from './resolve-path';

function coerceString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function coerceBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

let itemsDb: Record<string, Record<string, unknown>> | null = null;

export function loadItems(): Record<string, Record<string, unknown>> {
  if (itemsDb) return itemsDb;
  try {
    const data = fs.readFileSync(resolveProjectFile('data/items.json'), 'utf8');
    const itemsList = JSON.parse(data) as Array<Record<string, unknown>>;
    itemsDb = {};
    for (const item of itemsList) {
      const rawId = item.id ?? item.itemID;
      const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : undefined;
      if (id !== undefined) itemsDb[String(id)] = item;
    }
    console.log(`Loaded ${Object.keys(itemsDb).length} items into database.`);
  } catch (e) {
    console.error('Failed to load items database:', getErrorMessage(e));
    itemsDb = {};
  }
  return itemsDb;
}

export function getItemDetails(itemId: number): ItemDetails {
  const db = loadItems();
  const itemStrId = String(itemId);
  const currentItem: ItemDetails = {
    id: itemId,
    name: 'Unknown Item',
    type: 'UNKNOWN',
    rarity: 'NONE',
    description: '',
    is_unique: false,
    image: `https://raw.githubusercontent.com/ashqking/FF-Items/main/ICONS/${itemId}.png`,
    image_fallback: `https://raw.githubusercontent.com/I-SHOW-AKIRU200/AKIRU-ICONS/main/ICONS/${itemId}.png`
  };

  if (db[itemStrId]) {
    const itemData = db[itemStrId];
    currentItem.name = coerceString(itemData.name ?? itemData.description ?? 'Unknown Name');
    currentItem.type = coerceString(itemData.type ?? 'UNKNOWN');
    currentItem.collection_type = coerceString(itemData.collection_type ?? 'NONE');
    currentItem.rarity = coerceString(itemData.rare ?? 'NONE');
    currentItem.description = coerceString(itemData.description ?? '');
    currentItem.is_unique = coerceBoolean(itemData.is_unique ?? false);
    currentItem.icon_code = coerceString(itemData.icon ?? '');
  }

  return currentItem;
}

export function processPlayerItems(playerData: PlayerProfile): ProcessedPlayerItems {
  const profileInfo = playerData.profileinfo;
  const basicInfo = playerData.basicinfo;
  const petInfo = playerData.petinfo;

  const outfitIds = profileInfo.clothes ?? [];
  const outfitDetails = outfitIds.map(getItemDetails);

  const weaponIds = basicInfo.weaponskinshows ?? [];
  const weaponDetails = weaponIds.map(getItemDetails);

  const skillIds = profileInfo.equipedskills ?? [];
  const skillDetails = skillIds.map(getItemDetails);

  let petDetails: ProcessedPlayerItems['items']['pet'] = null;
  if (petInfo && (petInfo.id || petInfo.skinid)) {
    petDetails = {
      id: getItemDetails(petInfo.id),
      name: petInfo.name || '',
      level: petInfo.level || 0,
      skin: getItemDetails(petInfo.skinid),
      selected_skill: getItemDetails(petInfo.selectedskillid)
    };
  }

  const normalizedBasicInfo = {
    accountid: basicInfo.accountid || '',
    nickname: basicInfo.nickname || '',
    level: basicInfo.level || 0,
    region: basicInfo.region || '',
    liked: basicInfo.liked || '',
    signature: basicInfo.signature || ''
  };

  return {
    basic_info: normalizedBasicInfo,
    items: {
      outfit: outfitDetails,
      skills: { equipped: skillDetails },
      weapons: { shown_skins: weaponDetails },
      pet: petDetails
    }
  };
}
