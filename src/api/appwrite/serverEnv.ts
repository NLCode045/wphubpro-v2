/**
 * Server-only — used by `src/api/appwrite/*` handlers (API host / Node). Do not import from React.
 */
export type AppwriteServerEnv = {
  endpoint: string;
  projectId: string;
  apiKey: string;
  encryptionKey: string;
  databaseId: string;
};

export function getAppwriteServerEnv(): AppwriteServerEnv {
  const endpoint = (process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const projectId = process.env.APPWRITE_PROJECT_ID || '';
  const apiKey =
    process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY || '';
  const encryptionKey = process.env.ENCRYPTION_KEY || '';
  const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.DATABASE_ID || 'platform_db';
  return { endpoint, projectId, apiKey, encryptionKey, databaseId };
}

export function assertServerConfigured(env: AppwriteServerEnv): void {
  if (!env.endpoint || !env.projectId || !env.apiKey) {
    throw new Error('APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY are required on the API host');
  }
}
