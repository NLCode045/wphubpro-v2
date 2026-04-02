import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface PlatformSettingItem {
  key: string;
  value: unknown;
}

async function fetchPlatformSettings(userId: string): Promise<PlatformSettingItem[]> {
  const res = await executeFunction<{ success?: boolean; items?: PlatformSettingItem[] }>(
    APPWRITE_FUNCTION_IDS.MANAGE_SETTINGS,
    { action: 'list', userId },
  );
  return Array.isArray(res?.items) ? res.items : [];
}

export function usePlatformSettingsList(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'platform-settings', userId],
    queryFn: () => fetchPlatformSettings(userId as string),
    enabled: typeof userId === 'string' && userId.length > 0,
  });
}

export function usePlatformSettingsUpsert(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      settings,
    }: {
      category: string;
      settings: Record<string, unknown>;
    }) => {
      if (!userId) {
        throw new Error('You must be signed in to save platform settings.');
      }
      await executeFunction(APPWRITE_FUNCTION_IDS.MANAGE_SETTINGS, { category, settings, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-settings'] });
    },
  });
}
