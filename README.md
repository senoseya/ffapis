<div align="center">
  <img src="https://z1.storage.malvo.app/bucket/repo/ffapis.png" width="100%" alt="ffapis" />
</div>

# FF Apis

Integrate Free Fire player data into your apps, bots, or AI agents. Search players, fetch profiles/stats/items, send likes, and register accounts — with auto-managed guest authentication and built-in AI tool calling for LLMs.

```bash
npm install ffapis
```

```ts
import { FreeFireAPI } from 'ffapis';
const api = new FreeFireAPI();
const players = await api.searchAccount('nickname');
```

## Docs

| Doc | What |
|-----|------|
| [`./docs/quickstart.md`](./docs/quickstart.md) | Install, first API call, auth flow |
| [`./docs/api-reference.md`](./docs/api-reference.md) | All methods: search, profile, stats, items, register, like |
| [`./docs/ai-tool-calling.md`](./docs/ai-tool-calling.md) | LLM integration (Groq, OpenAI, Claude) |
| [`./docs/configuration.md`](./docs/configuration.md) | `settings.yaml`, credentials, regions |
| [`./docs/troubleshooting.md`](./docs/troubleshooting.md) | Common errors, OB updates, debug tips |
| [`./docs/full_testing.md`](./docs/full_testing.md) | Full test logs with raw output |
| [`./llms.txt`](./llms.txt) | Full context dump for LLM vibecoding |
| [`./NOTE.md`](./NOTE.md) | OB update checklist & PR notes |

## Test Results

Last verified: **17 Mei 2026, 01:45 WITA**

| Test | Status |
|------|--------|
| Non-AI API (Login/Search/Profile/Stats/Items/Like) | 6/6 pass |
| All AI Tools | 5/5 pass |
| Groq AI Tool Calling | AI chained tools & responded in Indonesian |

Full report: [`./docs/full_testing.md`](./docs/full_testing.md)

## License

GPL-3.0
