# site-heartbeat-poke

Runs every minute. Loops over **active** sites with `bridge_status=connected` and sends a GET request to `/wp-json/wphubpro/v1/heartbeat/poke` on each site (WordPress plugin endpoint).

## Filter

- `bridge_status` = connected
- `meta_data.enabled` !== false (active sites)
- Has `site_url` and `api_key`

## Environment

Set in **Appwrite Console** → **Functions** → **site-heartbeat-poke** → **Variables**:

| Variable | Required | Description |
|----------|----------|--------------|
| `APPWRITE_ENDPOINT` | Yes | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` | Yes | Project ID |
| `APPWRITE_API_KEY` | Yes | API key with databases.read |
| `ENCRYPTION_KEY` | If encrypted keys | Same as wphub-sites, for decrypting api_key |
