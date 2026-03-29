/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_FUNCTION_ZIP_PARSER?: string;
  readonly VITE_APPWRITE_FUNCTION_LIBRARY_DELETE?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
