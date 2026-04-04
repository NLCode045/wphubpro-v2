/**
 * Latest WPHubPro Bridge plugin from Appwrite bucket "bridge".
 * Uses bridge-download-url function for token-based URL (WordPress can download).
 * Fallback to storage list when function unavailable (sidebar version + view URL).
 */
import { useQuery } from '@tanstack/react-query';
import { functions, storage, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '../services/appwrite';

const BRIDGE_BUCKET_ID = 'bridge';
const BRIDGE_PLUGIN_SLUG = 'wphubpro-bridge';

function parseVersionFromName(name: string): string | null {
  const m = name.match(/wphubpro-bridge-(\d+\.\d+\.\d+)\.zip$/i);
  return m ? m[1] : null;
}

/** Compare two version strings (e.g. "2.2.0" vs "2.2.1"). Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export interface LatestBridgeInfo {
  version: string;
  fileId: string;
  fileName: string;
  downloadUrl: string;
}

async function fetchFromStorage(): Promise<LatestBridgeInfo | null> {
  const list = await storage.listFiles(BRIDGE_BUCKET_ID, []);
  const withVersions = (list.files || [])
    .map((f: { $id: string; name: string }) => ({
      $id: f.$id,
      name: f.name,
      version: parseVersionFromName(f.name),
    }))
    .filter((f): f is { $id: string; name: string; version: string } => f.version != null);
  if (withVersions.length === 0) return null;
  withVersions.sort((a, b) => compareVersions(b.version, a.version));
  const latest = withVersions[0];
  // /download = Content-Disposition: attachment (proper zip). Bucket read("any") = no token needed.
  const downloadUrl = `${APPWRITE_ENDPOINT.replace(/\/$/, '')}/storage/buckets/${BRIDGE_BUCKET_ID}/files/${latest.$id}/download?project=${APPWRITE_PROJECT_ID}`;
  return { version: latest.version, fileId: latest.$id, fileName: latest.name, downloadUrl };
}

async function fetchLatestBridge(): Promise<LatestBridgeInfo | null> {
  try {
    const exec = await functions.createExecution('bridge-download-url', '', false);
    if (exec.responseStatusCode >= 200 && exec.responseStatusCode < 300) {
      const data = JSON.parse(exec.responseBody || '{}');
      if (data.success && data.downloadUrl) {
        return {
          version: data.version,
          fileId: data.fileId,
          fileName: data.fileName,
          downloadUrl: data.downloadUrl,
        };
      }
    }
  } catch {
    // Function may not be deployed
  }
  return fetchFromStorage();
}

export function useLatestBridge() {
  return useQuery({
    queryKey: ['latestBridge'],
    queryFn: fetchLatestBridge,
    staleTime: 5 * 60 * 1000,
  });
}

export function getBridgePluginSlug(): string {
  return BRIDGE_PLUGIN_SLUG;
}

/** Returns true if plugin file is the WPHubPro Bridge plugin. */
export function isBridgePlugin(pluginFile: string): boolean {
  return pluginFile.includes(BRIDGE_PLUGIN_SLUG);
}

/**
 * Enrich plugins list: if the bridge plugin is installed and latest from bucket is newer, set update.
 */
export function enrichPluginsWithBridgeUpdate<T extends { plugin: string; version: string; update?: string | null }>(
  plugins: T[],
  latestBridge: LatestBridgeInfo | null | undefined
): T[] {
  if (!latestBridge || !plugins.length) return plugins;
  return plugins.map((p) => {
    if (!isBridgePlugin(p.plugin)) return p;
    if (compareVersions(latestBridge.version, p.version) <= 0) return p;
    return { ...p, update: latestBridge.version };
  });
}
