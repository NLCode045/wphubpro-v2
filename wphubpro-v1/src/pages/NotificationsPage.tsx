import React, { useState } from 'react';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftTypography from 'components/SoftTypography';
import Footer from 'examples/Footer';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../domains/notifications';
import type { Notification, NotificationType } from '../types';
import { contentPageShellSx, contentPaperSurfaceSx, contentPaperPageTitleSx } from '../theme/contentPaper';

const TYPE_LABELS: Record<NotificationType, string> = {
  platform: 'Platform',
  site_connection: 'Site error',
  plugin_update: 'Plugin update',
  theme_update: 'Theme update',
  site_report: 'Site report',
  subscription: 'Subscription',
};

const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data, isLoading } = useNotifications({
    unreadOnly: filter === 'unread',
    limit: 100,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <SoftTypography sx={contentPaperPageTitleSx}>
            Notifications
          </SoftTypography>
          <SoftBox display="flex" gap={1}>
            <SoftButton
              size="small"
              variant={filter === 'all' ? 'contained' : 'outlined'}
              color="info"
              onClick={() => setFilter('all')}
            >
              All
            </SoftButton>
            <SoftButton
              size="small"
              variant={filter === 'unread' ? 'contained' : 'outlined'}
              color="info"
              onClick={() => setFilter('unread')}
            >
              Unread
            </SoftButton>
            {unreadCount > 0 && (
              <SoftButton
                size="small"
                variant="outlined"
                color="info"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Mark all as read
              </SoftButton>
            )}
          </SoftBox>
        </SoftBox>

        <Card sx={contentPaperSurfaceSx}>
          {isLoading ? (
            <SoftBox p={3}>
              <SoftTypography color="text">Loading...</SoftTypography>
            </SoftBox>
          ) : notifications.length === 0 ? (
            <SoftBox p={3} textAlign="center">
              <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }}>notifications_none</Icon>
              <SoftTypography variant="h6" color="secondary">
                No notifications
              </SoftTypography>
            </SoftBox>
          ) : (
            <SoftBox component="ul" p={0} m={0} sx={{ listStyle: 'none' }}>
              {notifications.map((n) => (
                <NotificationItem
                  key={n.$id}
                  notification={n}
                  onMarkRead={() => markRead.mutate(n.$id)}
                  isMarking={markRead.isPending}
                />
              ))}
            </SoftBox>
          )}
        </Card>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkRead: () => void;
  isMarking: boolean;
}> = ({ notification, onMarkRead, isMarking }) => {
  const date = new Date(notification.$createdAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SoftBox
      component="li"
      px={3}
      py={2}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        bgcolor: notification.read ? 'transparent' : 'action.hover',
      }}
      display="flex"
      alignItems="flex-start"
      gap={2}
    >
      <Icon sx={{ color: 'info.main', mt: 0.25 }}>notifications</Icon>
      <SoftBox flex={1} minWidth={0}>
        <SoftBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <SoftTypography variant="button" fontWeight="bold">
            {notification.title}
          </SoftTypography>
          <SoftTypography variant="caption" color="secondary">
            {TYPE_LABELS[notification.type]} · {date}
          </SoftTypography>
        </SoftBox>
        <SoftTypography variant="body2" color="text" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
          {notification.body}
        </SoftTypography>
      </SoftBox>
      {!notification.read && (
        <IconButton size="small" onClick={onMarkRead} disabled={isMarking} aria-label="Mark as read">
          <Icon fontSize="small">done</Icon>
        </IconButton>
      )}
    </SoftBox>
  );
};

export default NotificationsPage;
