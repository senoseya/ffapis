# Troubleshooting

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Session expired / OB version mismatch | Update `HEADERS_COMMON_RELEASE_VERSION` in `config/settings.yaml` |
| `400 Bad Request` | Protobuf schema changed | Update `.proto` files from game dump |
| `ECONNRESET` | Server rate limit / unstable | Retry after delay, use fresh credential |
| `No credentials available` | Missing credential YAML | Add accounts to `config/credentials/{region}.yaml` |
| `ENOENT: ...items.json` | Missing data file | Ensure `data/items.json` exists |
| `ENOENT: ...proto` | Missing proto files | Ensure `proto/` dir exists with all `.proto` files |

## OB Version Update

When Free Fire updates to new OB:
1. Edit `config/settings.yaml`:
   ```yaml
   HEADERS_COMMON_RELEASE_VERSION: "OB54"  # was OB53
   ```
2. Run tests:
   ```bash
   npm run build
   npm run test:all
   ```

## Debug

Enable verbose logging by checking `src/test/*.ts` scripts. Each shows full API flow.

### Quick Test Commands

```bash
npm run test:all          # All tests
npm run test:search       # Search only
npm run test:profile      # Profile only
npm run test:stats        # Stats only
npm run test:items        # Items only
npm run test:register     # Register test
npm run test:like 123 IND 5  # Send 5 likes
npm run test:groq-ai      # AI tool calling test
```
