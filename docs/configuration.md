# Configuration

## `config/settings.yaml`

Core constants. **Update OB version when Free Fire updates.**

```yaml
AE_MAIN_KEY: "Yg&tc%DEuh6%Zc^8"
AE_MAIN_IV: "6oyZDr22E3ychjM%"

HEADERS_COMMON_RELEASE_VERSION: "OB53"  # <-- UPDATE THIS ON OB CHANGE

URL_GARENA_TOKEN: "https://ffmconnect.live.gop.garenanow.com/oauth/guest/token/grant"
URL_GUEST_REGISTER: "https://ffmconnect.live.gop.garenanow.com/oauth/guest/register"
URL_MAJOR_LOGIN: "https://loginbp.ggblueshark.com/MajorLogin"
URL_MAJOR_REGISTER: "https://loginbp.ggblueshark.com/MajorRegister"

GARENA_CLIENT_ID: "100067"
GARENA_CLIENT_SECRET: "..."
```

## Credentials

### File: `config/credentials/{region}.yaml`

```yaml
- UID: "123456789"
  PASSWORD: "abc123"
- UID: "987654321"
  PASSWORD: "xyz789"
```

### Auto-rotate
Random credential selected per API call. Used credentials tracked per target to prevent reuse.

## Regions

Supported: `IND`, `SG`, `BR`, `US`, `RU`, `TH`, `VN`, `TW`, `ME`, `CIS`, `BD`

**Note:** ID, PK do NOT support guest registration.

## Custom Credentials (Optional)

Pass directly:
```ts
await api.login('uid', 'password');
```
