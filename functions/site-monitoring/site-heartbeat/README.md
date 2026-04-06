# site-heartbeat

Receives heartbeat from the WordPress bridge every minute. Validates `secret` (which may be encrypted) against the plaintext `api_key` from the site document. Updates `bridge_status` and `heartbeat_updated_at`.

**Database:** The `sites` collection must have:
- `bridge_status` (enum: connected | disconnected)
- `heartbeat_updated_at` (datetime) – stores last successful heartbeat as ISO 8601
- `api_key` – stored plaintext (not encrypted)

## Request

The bridge sends a POST with body:
```json
{ "siteId": "<document-id>", "site_id": "<document-id>", "secret": "<encrypted_api_key>" }
```

The `secret` is decrypted (iv:encrypted:tag with ENCRYPTION_KEY) before it is compared with the plaintext `api_key` from the site document.

## Environment variables

Set in **Appwrite Console** → **Functions** → **site-heartbeat** → **Variables**:

| Key | Description |
|-----|-------------|
| `APPWRITE_ENDPOINT` | Appwrite API URL |
| `APPWRITE_PROJECT_ID` | Project ID |
| `APPWRITE_API_KEY` | API key with databases read/write |
| `ENCRYPTION_KEY` | Key for decrypting the incoming `secret` (must match wphub-sites) |
