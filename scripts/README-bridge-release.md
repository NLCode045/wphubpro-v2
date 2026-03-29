# Bridge release (version bump + zip to Appwrite)

The **wphubpro-bridge** plugin is a separate repo, independent from wphubpro. To release:

1. **Bump the version** in the bridge plugin main file (header `Version:` and `WPHUBPRO_BRIDGE_VERSION`).
2. **Create a zip** of the bridge plugin (excluding `.git`, `.gitignore`, `node_modules`).
3. **Upload the zip** to the Appwrite storage bucket **bridge**.

## Setup

1. **Bridge repo**  
   Clone wphubpro-bridge as a sibling of wphubpro, or set `BRIDGE_DIR` in `.env` (e.g. `BRIDGE_DIR=../wphubpro-bridge`).

2. **Create the bucket in Appwrite**  
   The bucket `bridge` is defined in `appwrite.config.json`. Apply your config so the bucket exists and allows `.zip` files.

3. **Environment**  
   From the wphubpro repo root, ensure `.env` has:
   - `APPWRITE_ENDPOINT` (e.g. `https://api.wphub.pro/v1`)
   - `APPWRITE_PROJECT_ID`
   - `APPWRITE_API_KEY` (or `APPWRITE_FUNCTION_API_KEY`)
   - `BRIDGE_DIR` (optional, defaults to `../wphubpro-bridge`)

## Manual run

From the **main repo root** (wphubpro):

```bash
npm run bridge:release
# or
node scripts/bridge-release.js
```

This bumps the patch version in the plugin main file, zips the bridge, and uploads to the Appwrite bucket **bridge**. The updated version in the main file is left in your working tree; commit it if you want the version bump in the repo.
