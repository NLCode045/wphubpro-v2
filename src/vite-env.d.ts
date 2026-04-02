/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APPWRITE_FUNCTION_HEALTH_AI_AGENT?: string;
  readonly APPWRITE_FUNCTION_WP_PROXY?: string;
  readonly APPWRITE_FUNCTION_ZIP_PARSER?: string;
  readonly APPWRITE_FUNCTION_LIBRARY_DELETE?: string;
  readonly STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
