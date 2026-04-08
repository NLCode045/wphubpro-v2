import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface PlatformSettingItem {
  key: string;
  value: unknown;
}

async function fetchPlatformSettings(): Promise<PlatformSettingItem[]> {
  const res = await executeFunction<{ success?: boolean; items?: PlatformSettingItem[] }>(
    APPWRITE_FUNCTION_IDS.MANAGE_SETTINGS,
    { action: 'list' },
    { omitImpersonationHeaders: true },
  );
  return Array.isArray(res?.items) ? res.items : [];
}

export function usePlatformSettingsList() {
  return useQuery({
    queryKey: ['admin', 'platform-settings'],
    queryFn: () => fetchPlatformSettings(),
    enabled: true,
  });
}

export function usePlatformSettingsUpsert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      settings,
    }: {
      category: string;
      settings: Record<string, unknown>;
    }) => {
      await executeFunction(
        APPWRITE_FUNCTION_IDS.MANAGE_SETTINGS,
        { category, settings },
        { omitImpersonationHeaders: true },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-auth-config'] });
    },
  });
}
