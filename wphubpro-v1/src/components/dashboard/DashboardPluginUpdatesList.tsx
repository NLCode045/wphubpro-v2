/**
 * Dashboard plugin updates list - all available updates across sites
 * Shows plugin name, latest version, release date, sites count
 * Clicking sites count expands list of sites with Update button
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@mui/material/Card';
import Collapse from '@mui/material/Collapse';
import Icon from '@mui/material/Icon';
import SoftButton from 'components/SoftButton';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import { useUpdatePlugin } from '../../hooks/useWordPress';
import type { AggregatedPluginUpdate } from '../../hooks/useWordPress';
import ScrollableBox from '../ui/ScrollableBox';

const blueGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = 'linear-gradient(310deg, #ea580c, #fb923c)';

interface DashboardPluginUpdatesListProps {
  pluginUpdatesList: AggregatedPluginUpdate[];
  isLoading?: boolean;
}

function formatReleaseDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const DashboardPluginUpdatesList: React.FC<DashboardPluginUpdatesListProps> = ({
  pluginUpdatesList,
  isLoading = false,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  if (pluginUpdatesList.length === 0 && !isLoading) {
    return (
      <Card sx={{ background: blueGradient, color: 'white', borderRadius: 2, flex: 1, minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', '& .MuiTypography-root': { color: 'white !important' } }}>
        <SoftBox p={2}>
          <SoftTypography variant="h6" fontWeight="bold" color="white" mb={1}>
            Available updates
          </SoftTypography>
          <SoftTypography variant="caption" color="white" sx={{ opacity: 0.9 }}>
            No plugin updates available.
          </SoftTypography>
        </SoftBox>
      </Card>
    );
  }

  return (
    <Card sx={{ background: blueGradient, color: 'white', borderRadius: 2, flex: 1, minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', '& .MuiTypography-root': { color: 'white !important' } }}>
      <SoftBox p={2} sx={{ flexShrink: 0 }}>
        <SoftTypography variant="h6" fontWeight="bold" color="white" mb={1.5}>
          Available updates
        </SoftTypography>
      </SoftBox>
      {isLoading ? (
        <SoftBox px={2} pb={2}>
          <SoftTypography variant="caption" color="white">Loading...</SoftTypography>
        </SoftBox>
      ) : (
        <ScrollableBox
          fill
          showArrows={false}
          sx={{ flex: 1, minHeight: 0 }}
        >
          <SoftBox display="flex" flexDirection="column" gap={1} p={2} pt={0} pb={3}>
              {pluginUpdatesList.map((item) => (
                <PluginUpdateRow
                  key={item.pluginSlug}
                  item={item}
                  expanded={expanded.has(item.pluginSlug)}
                  onToggle={() => toggleExpanded(item.pluginSlug)}
                />
              ))}
            </SoftBox>
          </ScrollableBox>
      )}
    </Card>
  );
};

interface PluginUpdateRowProps {
  item: AggregatedPluginUpdate;
  expanded: boolean;
  onToggle: () => void;
}

const PluginUpdateRow: React.FC<PluginUpdateRowProps> = ({ item, expanded, onToggle }) => {
  const updatePlugin = useUpdatePlugin();

  return (
    <SoftBox
      sx={{
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <SoftBox
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        p={1.5}
        sx={{ cursor: 'pointer' }}
        onClick={onToggle}
      >
        <SoftBox flex={1} minWidth={0}>
          <SoftTypography variant="button" fontWeight="medium" color="white">
            {item.name}
          </SoftTypography>
          <SoftBox display="flex" alignItems="center" gap={2} mt={0.25}>
            <SoftTypography variant="caption" color="white" sx={{ opacity: 0.9 }}>
              v{item.latestVersion}
            </SoftTypography>
            <SoftTypography variant="caption" color="white" sx={{ opacity: 0.8 }}>
              {formatReleaseDate(item.releaseDate)}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
        <SoftBox
          display="inline-flex"
          alignItems="center"
          gap={0.5}
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            background: orangeGradient,
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <SoftTypography variant="caption" fontWeight="bold" color="white">
            {item.sites.length} {item.sites.length === 1 ? 'site' : 'sites'}
          </SoftTypography>
          <Icon sx={{ fontSize: 18, color: 'white', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </Icon>
        </SoftBox>
      </SoftBox>
      <Collapse in={expanded}>
        <SoftBox
          px={1.5}
          pb={1.5}
          pt={0}
          borderTop="1px solid rgba(255,255,255,0.2)"
          onClick={(e) => e.stopPropagation()}
        >
          {item.sites.map((s) => (
            <SoftBox
              key={s.siteId}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              py={1}
              borderBottom="1px solid rgba(255,255,255,0.1)"
              sx={{ '&:last-child': { borderBottom: 'none' } }}
            >
              <SoftBox flex={1} minWidth={0}>
                <Link to={`/sites/${s.siteId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <SoftTypography variant="caption" fontWeight="medium" color="white" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                    {s.siteName}
                  </SoftTypography>
                </Link>
                <SoftTypography variant="caption" color="white" display="block" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                  Installed: v{s.installedVersion}
                </SoftTypography>
              </SoftBox>
              <SoftButton
                variant="contained"
                size="small"
                onClick={() =>
                  updatePlugin.mutate({
                    siteId: s.siteId,
                    pluginFile: s.pluginFile,
                    pluginName: item.name,
                  })
                }
                disabled={updatePlugin.isPending}
                sx={{
                  background: 'white',
                  color: '#4F5482',
                  minWidth: 80,
                  '&:hover': { background: 'rgba(255,255,255,0.9)' },
                }}
              >
                Update
              </SoftButton>
            </SoftBox>
          ))}
        </SoftBox>
      </Collapse>
    </SoftBox>
  );
};

export default DashboardPluginUpdatesList;
