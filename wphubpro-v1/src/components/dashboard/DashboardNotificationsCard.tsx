/**
 * Dashboard sidebar: unread count summary; expands to paginated list (5 per page).
 */
import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../domains/notifications';
import type { Notification, NotificationType } from '../../types';
import { ROUTE_PATHS } from '../../config/routePaths';
import { contentPaperSurfaceSx } from '../../theme/contentPaper';

const PAGE_SIZE = 5;

const TYPE_LABELS: Record<NotificationType, string> = {
  platform: 'Platform',
  site_connection: 'Site error',
  plugin_update: 'Plugin update',
  theme_update: 'Theme update',
  site_report: 'Site report',
  subscription: 'Subscription',
};

const DashboardNotificationsCard: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const { data, isLoading } = useNotifications({ unreadOnly: true, limit: 100 });

  const unread = data?.notifications ?? [];
  const total = unread.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(page, Math.max(0, totalPages - 1));
  const pageItems = unread.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const openSummary = () => {
    setExpanded(false);
    setPage(0);
  };

  const toggleFromSummary = () => {
    setExpanded(true);
    setPage(0);
  };

  return (
    <Card sx={contentPaperSurfaceSx}>
      <SoftBox p={2}>
        {!expanded ? (
          <SoftBox
            component="button"
            type="button"
            onClick={toggleFromSummary}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              p: 0,
              m: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              font: 'inherit',
              color: 'inherit',
              borderRadius: 1,
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <SoftBox display="flex" alignItems="center" gap={1.5} minWidth={0}>
              <Icon sx={{ color: 'info.main', flexShrink: 0 }}>notifications</Icon>
              <SoftTypography variant="button" fontWeight="bold" sx={{ color: 'text.primary' }}>
                unread notifications
              </SoftTypography>
            </SoftBox>
            {isLoading ? (
              <SoftTypography variant="caption" color="secondary">
                …
              </SoftTypography>
            ) : (
              <SoftTypography
                variant="h6"
                component="span"
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 800,
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                {total}
              </SoftTypography>
            )}
          </SoftBox>
        ) : (
          <>
            <SoftBox display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <SoftTypography variant="button" fontWeight="bold" color="text">
                unread notifications
              </SoftTypography>
              <IconButton size="small" onClick={openSummary} aria-label="Show summary">
                <Icon fontSize="small">expand_less</Icon>
              </IconButton>
            </SoftBox>

            {isLoading ? (
              <SoftTypography variant="body2" color="secondary">
                Loading…
              </SoftTypography>
            ) : total === 0 ? (
              <SoftTypography variant="body2" color="secondary">
                No unread notifications.
              </SoftTypography>
            ) : (
              <>
                <SoftBox component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                  {pageItems.map((n) => (
                    <CompactNotificationRow key={n.$id} notification={n} />
                  ))}
                </SoftBox>

                {total > PAGE_SIZE && (
                  <SoftBox display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={1.5}>
                    <IconButton
                      size="small"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={clampedPage <= 0}
                      aria-label="Previous page"
                    >
                      <Icon fontSize="small">chevron_left</Icon>
                    </IconButton>
                    <SoftTypography variant="caption" color="secondary" sx={{ minWidth: '4.5rem', textAlign: 'center' }}>
                      {clampedPage + 1} / {totalPages}
                    </SoftTypography>
                    <IconButton
                      size="small"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={clampedPage >= totalPages - 1}
                      aria-label="Next page"
                    >
                      <Icon fontSize="small">chevron_right</Icon>
                    </IconButton>
                  </SoftBox>
                )}

                <SoftButton
                  size="small"
                  color="info"
                  fullWidth
                  sx={{ mt: 1.5 }}
                  onClick={() => navigate(ROUTE_PATHS.NOTIFICATIONS)}
                >
                  View all notifications
                </SoftButton>
              </>
            )}
          </>
        )}
      </SoftBox>
    </Card>
  );
};

function CompactNotificationRow({ notification }: { notification: Notification }) {
  const date = new Date(notification.$createdAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SoftBox
      component="li"
      py={1}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none', pb: 0 },
      }}
    >
      <SoftTypography variant="button" fontWeight="bold" display="block" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {notification.title}
      </SoftTypography>
      <SoftTypography variant="caption" color="secondary" display="block">
        {TYPE_LABELS[notification.type]} · {date}
      </SoftTypography>
      {notification.body ? (
        <SoftTypography
          variant="body2"
          color="secondary"
          sx={{
            mt: 0.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {notification.body}
        </SoftTypography>
      ) : null}
    </SoftBox>
  );
}

export default DashboardNotificationsCard;
