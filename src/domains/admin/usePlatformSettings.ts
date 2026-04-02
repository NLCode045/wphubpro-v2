import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface PlatformSettingItem {
  key: string;
  value: unknown;
}

const MANAGE_SETTINGS_FN = 'manage-settings';

async function fetchPlatformSettings(userId: string): Promise<PlatformSettingItem[]> {
  const res = await executeFunction<{ success?: boolean; items?: PlatformSettingItem[] }>(
    MANAGE_SETTINGS_FN,
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
      await executeFunction(MANAGE_SETTINGS_FN, { category, settings, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-settings'] });
    },
  });
}
