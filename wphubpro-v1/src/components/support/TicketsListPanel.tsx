/**
 * User helpdesk ticket list (reused on Support hub and legacy /tickets).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { useTickets } from '../../domains/tickets';
import { ROUTE_PATHS } from '../../config/routePaths';
import { contentPaperSurfaceSx } from '../../theme/contentPaper';
import type { Ticket } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export type TicketsListPanelProps = {
  /** Show title row + New ticket (hide when embedded in Support layout that has its own header) */
  showToolbar?: boolean;
  /** With `showToolbar`, hide the “Tickets” label (e.g. Support hub tabs already show it). */
  toolbarActionsOnly?: boolean;
  /** `embedded` defaults toolbar off; override with `showToolbar` when needed */
  variant?: 'default' | 'embedded';
  /** When set, called instead of navigating to ticket detail */
  onRowClick?: (ticket: Ticket) => void;
};

const TicketsListPanel: React.FC<TicketsListPanelProps> = ({
  showToolbar,
  toolbarActionsOnly,
  variant = 'default',
  onRowClick,
}) => {
  const navigate = useNavigate();
  const { data, isLoading } = useTickets();
  const tickets = data?.tickets ?? [];
  const toolbarVisible = showToolbar ?? variant !== 'embedded';

  const handleRowClick = (t: Ticket) => {
    if (onRowClick) {
      onRowClick(t);
      return;
    }
    navigate(ROUTE_PATHS.TICKET_DETAIL.replace(':id', t.$id));
  };

  return (
    <SoftBox>
      {toolbarVisible && (
        <SoftBox
          display="flex"
          justifyContent={toolbarActionsOnly ? 'flex-end' : 'space-between'}
          alignItems="center"
          mb={2}
          flexWrap="wrap"
          gap={1}
        >
          {!toolbarActionsOnly && (
            <SoftTypography variant="h6" fontWeight="bold" color="text">
              Tickets
            </SoftTypography>
          )}
          <SoftButton
            variant="gradient"
            color="info"
            size="small"
            onClick={() => navigate(ROUTE_PATHS.TICKET_NEW)}
            startIcon={<Icon>add</Icon>}
          >
            New ticket
          </SoftButton>
        </SoftBox>
      )}

      <Card sx={contentPaperSurfaceSx}>
        {isLoading ? (
          <SoftBox p={3}>
            <SoftTypography color="text">Loading...</SoftTypography>
          </SoftBox>
        ) : tickets.length === 0 ? (
          <SoftBox p={3} textAlign="center">
            <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }}>confirmation_number</Icon>
            <SoftTypography variant="h6" color="secondary" mb={1}>
              No tickets
            </SoftTypography>
            <SoftButton variant="gradient" color="info" onClick={() => navigate(ROUTE_PATHS.TICKET_NEW)}>
              Create first ticket
            </SoftButton>
          </SoftBox>
        ) : (
          <SoftBox component="ul" p={0} m={0} sx={{ listStyle: 'none' }}>
            {tickets.map((t) => (
              <SoftBox
                key={t.$id}
                component="li"
                px={3}
                py={2}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'grey.200',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => handleRowClick(t)}
              >
                <SoftBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <SoftTypography variant="button" fontWeight="bold">
                    {t.subject}
                  </SoftTypography>
                  <SoftBox display="flex" gap={1}>
                    <SoftBox
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        fontSize: '0.75rem',
                      }}
                    >
                      {STATUS_LABELS[t.status] ?? t.status}
                    </SoftBox>
                    <SoftTypography variant="caption" color="secondary">
                      {PRIORITY_LABELS[t.priority] ?? t.priority}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
                <SoftTypography variant="caption" color="secondary">
                  {new Date(t.$createdAt).toLocaleDateString('en-US')}
                </SoftTypography>
              </SoftBox>
            ))}
          </SoftBox>
        )}
      </Card>
    </SoftBox>
  );
};

export default TicketsListPanel;
