# Quick Start

## Install

```bash
npm install ffapis
```

## First API Call

```ts
import { FreeFireAPI } from 'ffapis';

const api = new FreeFireAPI();

// Search player
const players = await api.searchAccount('FannBot');
console.log(players);

// Get profile
const profile = await api.getPlayerProfile('7512027025');
console.log(profile.basicinfo.nickname, profile.basicinfo.level);

// Get stats
const br = await api.getPlayerStats('7512027025', 'br', 'career');
const cs = await api.getPlayerStats('7512027025', 'cs', 'career');
```

## Auth Flow

Auto-managed. First API call triggers:
1. Load random credential from `config/credentials/{region}.yaml`
2. Garena guest token request
3. MajorLogin protobuf encode → POST → decode
4. Session cached for subsequent calls

Manual login if needed:
```ts
await api.login('uid', 'password');
```
