/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APPWRITE_ADMIN_TEAM_ID?: string;
  readonly APPWRITE_FUNCTION_ADMIN_MANAGE_USERS?: string;
  readonly APPWRITE_FUNCTION_CONVERSATIONS?: string;
  readonly APPWRITE_FUNCTION_FORUM?: string;
  readonly APPWRITE_FUNCTION_HEALTH_AI_AGENT?: string;
  readonly APPWRITE_FUNCTION_LIBRARY_DELETE?: string;
  readonly APPWRITE_FUNCTION_MANAGE_SETTINGS?: string;
  readonly APPWRITE_FUNCTION_MANAGE_VAULT_PROVIDERS?: string;
  readonly APPWRITE_FUNCTION_NOTIFICATIONS?: string;
  readonly APPWRITE_FUNCTION_STRIPE_INVOICES?: string;
  readonly APPWRITE_FUNCTION_STRIPE_ORDER_PAYMENTS?: string;
  readonly APPWRITE_FUNCTION_STRIPE_PAYMENT_METHODS?: string;
  readonly APPWRITE_FUNCTION_STRIPE_PORTAL_LINK?: string;
  readonly APPWRITE_FUNCTION_STRIPE_PRODUCTS?: string;
  readonly APPWRITE_FUNCTION_STRIPE_SUBSCRIPTIONS?: string;
  readonly APPWRITE_FUNCTION_TICKETS?: string;
  readonly APPWRITE_FUNCTION_WP_PROXY?: string;
  readonly APPWRITE_FUNCTION_WPHUB_SITES?: string;
  readonly APPWRITE_FUNCTION_ZIP_PARSER?: string;
  readonly APPWRITE_PLATFORM_SETTINGS_COLLECTION_ID?: string;
  readonly APPWRITE_STORAGE_BUCKET_BRIDGE_ID?: string;
  readonly APPWRITE_STORAGE_BUCKET_PLATFORM_ID?: string;
  readonly STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
