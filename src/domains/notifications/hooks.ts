import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import type { Notification } from '../../types';

interface NotificationsResponse {
  notifications: Array<{
    $id: string;
    user_id: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
    meta?: string;
    $createdAt: string;
  }>;
  total: number;
}

function mapDocToNotification(doc: NotificationsResponse['notifications'][0]): Notification {
  return {
    $id: doc.$id,
    userId: doc.user_id,
    type: doc.type as Notification['type'],
    title: doc.title,
    body: doc.body,
    read: doc.read,
    meta: doc.meta ? (JSON.parse(doc.meta) as Record<string, unknown>) : undefined,
    $createdAt: doc.$createdAt,
  };
}

export const useNotifications = (options?: { unreadOnly?: boolean; limit?: number }) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.$id, options?.unreadOnly, options?.limit],
    queryFn: async () => {
      const res = await executeFunction<NotificationsResponse>('notifications', {
        action: 'list',
        unreadOnly: options?.unreadOnly,
        limit: options?.limit ?? 50,
      });
      return {
        notifications: (res?.notifications ?? []).map(mapDocToNotification),
        total: res?.total ?? 0,
      };
    },
    enabled: !!user,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      executeFunction('notifications', { action: 'markRead', notificationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => executeFunction('notifications', { action: 'markAllRead' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
