# sync-site-meta

Bridge pushes `plugins_meta` and `themes_meta` to the sites collection. Called by the WordPress bridge with JWT from the connect flow.

## Environment variables

Set these in **Appwrite Console** → **Functions** → **sync-site-meta** → **Variables**:

| Key | Description |
|-----|-------------|
| `APPWRITE_ENDPOINT` | Appwrite API URL (e.g. `https://api.wphub.pro/v1`) |
| `APPWRITE_PROJECT_ID` | Project ID |
| `APPWRITE_API_KEY` | API key with databases read/write scope |

Use the same values as for `wp-proxy` or your project's global variables.
