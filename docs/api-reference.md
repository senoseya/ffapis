# API Reference

## FreeFireAPI

### `searchAccount(keyword: string): Promise<SearchResult[]>`
Search players by nickname.

```ts
const results = await api.searchAccount('FannBot');
// [{ accountid, nickname, level }, ...]
```

### `getPlayerProfile(uid: string | number): Promise<PlayerProfile>`
Get player details: basic info, clan, pet, equipped skills.

```ts
const profile = await api.getPlayerProfile('7512027025');
// { basicinfo, claninfo, petinfo, profileinfo }
```

### `getPlayerItems(uid: string | number): Promise<ProcessedPlayerItems | null>`
Get equipped items with metadata from `data/items.json`.

```ts
const items = await api.getPlayerItems('7512027025');
// { outfit, weapons, skills, pet, basic_info }
```

### `getPlayerStats(uid, mode, matchType): Promise<PlayerStats>`

| Param | Type | Description |
|-------|------|-------------|
| `mode` | `'br' \| 'cs'` | Battle Royale or Clash Squad |
| `matchType` | `'career' \| 'ranked' \| 'normal'` | Match type |

```ts
const br = await api.getPlayerStats('uid', 'br', 'career');
const cs = await api.getPlayerStats('uid', 'cs', 'ranked');
```

### `register(region: string, nickname?: string): Promise<RegisterResult>`
Create guest account.

```ts
const acc = await api.register('IND');
// { uid, password, passwordHash, region, nickname }
```

## LikeAPI

### `sendLikes(targetUid, region, likeCount): Promise<LikeResult>`
Send profile likes using guest accounts. Max 100/day per target.

```ts
import { LikeAPI } from 'ffapis';
const like = new LikeAPI();
await like.sendLikes('target_uid', 'IND', 100);
```
