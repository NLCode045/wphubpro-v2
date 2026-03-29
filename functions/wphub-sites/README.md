# wphub-sites

Creates and updates sites in the platform. Used when connecting a WordPress site from the bridge.

## Environment variables

Set these in **Appwrite Console** → **Functions** → **wphub-sites** → **Variables**:

| Key | Required | Description |
|-----|----------|-------------|
| `APPWRITE_ENDPOINT` | Yes | Appwrite API URL (e.g. `https://api.wphub.pro/v1`) |
| `APPWRITE_PROJECT_ID` | Yes | Project ID |
| `APPWRITE_API_KEY` | Yes | API key with databases read/write scope |
| `ENCRYPTION_KEY` | Yes | Secret key for encrypting api_key and password (min 32 chars) |

**Note:** Appwrite Cloud may auto-inject `APPWRITE_FUNCTION_*` variants. If you see "Function environment is not configured", add the variables above manually. `ENCRYPTION_KEY` must always be set – use a long random string (e.g. 32+ chars) and keep it the same across wp-proxy and wphub-sites.
