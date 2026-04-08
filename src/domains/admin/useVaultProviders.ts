import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const fnOpts = { omitImpersonationHeaders: true as const };

export type VaultProviderListItem = {
  id: string;
  provider: string;
  hasPayload: boolean;
};

type ListResponse = { success?: boolean; items?: VaultProviderListItem[]; message?: string };
type GetResponse = {
  success?: boolean;
  provider?: string;
  credentials?: Record<string, unknown>;
  message?: string;
};
type OkResponse = { success?: boolean; message?: string };

function assertFnOk<T extends { success?: boolean; message?: string }>(res: T, fallback: string): void {
  if (res && typeof res === 'object' && res.success === false) {
    throw new Error(typeof res.message === 'string' && res.message ? res.message : fallback);
  }
}

async function listVaultProviders(): Promise<VaultProviderListItem[]> {
  const res = await executeFunction<ListResponse>(
    APPWRITE_FUNCTION_IDS.MANAGE_VAULT_PROVIDERS,
    {
      action: 'list',
    },
    fnOpts,
  );
  assertFnOk(res, 'Could not list vault providers');
  return Array.isArray(res?.items) ? res.items : [];
}

async function getVaultProvider(provider: string): Promise<Record<string, unknown>> {
  const res = await executeFunction<GetResponse>(
    APPWRITE_FUNCTION_IDS.MANAGE_VAULT_PROVIDERS,
    {
      action: 'get',
      provider,
    },
    fnOpts,
  );
  assertFnOk(res, 'Could not load provider credentials');
  const c = res?.credentials;
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    return c as Record<string, unknown>;
  }
  return {};
}

export function useVaultProvidersList() {
  return useQuery({
    queryKey: ['admin', 'vault-providers'],
    queryFn: () => listVaultProviders(),
    enabled: true,
  });
}

export function useVaultProviderCredentials(provider: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'vault-provider', provider],
    queryFn: () => getVaultProvider(provider as string),
    enabled:
      typeof provider === 'string' &&
      provider.length > 0 &&
      enabled,
  });
}

export function useVaultProviderUpsert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      provider,
      credentials,
    }: {
      provider: string;
      credentials: Record<string, unknown>;
    }) => {
      const res = await executeFunction<OkResponse>(
        APPWRITE_FUNCTION_IDS.MANAGE_VAULT_PROVIDERS,
        {
          action: 'upsert',
          provider,
          credentials,
        },
        fnOpts,
      );
      assertFnOk(res, 'Could not save provider');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vault-providers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vault-provider'] });
    },
  });
}

export function useVaultProviderDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (provider: string) => {
      const res = await executeFunction<OkResponse>(
        APPWRITE_FUNCTION_IDS.MANAGE_VAULT_PROVIDERS,
        {
          action: 'delete',
          provider,
        },
        fnOpts,
      );
      assertFnOk(res, 'Could not delete provider');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vault-providers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vault-provider'] });
    },
  });
}
