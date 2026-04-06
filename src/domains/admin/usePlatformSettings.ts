import { useAuth } from '@/domains/auth';
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
    { omitImpersonationHeaders: true },
  );
  return Array.isArray(res?.items) ? res.items : [];
}

export function usePlatformSettingsList() {
  const { privilegedActorUserId } = useAuth();
  return useQuery({
    queryKey: ['admin', 'platform-settings', privilegedActorUserId],
    queryFn: () => fetchPlatformSettings(privilegedActorUserId as string),
    enabled: typeof privilegedActorUserId === 'string' && privilegedActorUserId.length > 0,
  });
}

export function usePlatformSettingsUpsert() {
  const queryClient = useQueryClient();
  const { privilegedActorUserId } = useAuth();

  return useMutation({
    mutationFn: async ({
      category,
      settings,
    }: {
      category: string;
      settings: Record<string, unknown>;
    }) => {
      if (!privilegedActorUserId) {
        throw new Error('You must be signed in to save platform settings.');
      }
      await executeFunction(
        APPWRITE_FUNCTION_IDS.MANAGE_SETTINGS,
        { category, settings, userId: privilegedActorUserId },
        { omitImpersonationHeaders: true },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-auth-config'] });
    },
  });
}
