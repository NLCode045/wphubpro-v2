/**
 * Top bar breadcrumbs: Home (orange icon) / page name (link) / current tab label (orange).
 * Tab links are not duplicated here — use the page tab bar for navigation.
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs } from '@mui/material';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';

import type { BreadcrumbConfig } from '../../contexts/PageBreadcrumbContext';

const ORANGE = '#ea580c';
const BLUE = '#4F5482';

function buildPathSegments(pathname: string): { label: string; to: string }[] {
  const parts = pathname.split('/').filter(Boolean);
  return parts.map((part, i) => ({
    label: decodeURIComponent(part).replace(/-/g, ' '),
    to: '/' + parts.slice(0, i + 1).join('/'),
  }));
}

function FallbackPathBreadcrumbs({
  pathname,
  simpleTitle,
}: {
  pathname: string;
  simpleTitle: string | null;
}) {
  const segments = buildPathSegments(pathname);
  if (segments.length === 0) {
    return (
      <SoftTypography component="span" variant="button" sx={{ color: ORANGE, textTransform: 'capitalize', fontSize: '0.875rem' }}>
        {simpleTitle || 'Dashboard'}
      </SoftTypography>
    );
  }
  const parents = segments.slice(0, -1);
  const last = segments[segments.length - 1];

  return (
    <SoftBox component="span" display="inline-flex" alignItems="center" flexWrap="wrap" gap={0.5} sx={{ minWidth: 0 }}>
      {parents.map((seg) => (
        <Link key={seg.to} to={seg.to} style={{ textDecoration: 'none' }}>
          <SoftTypography
            component="span"
            variant="button"
            sx={{ color: BLUE, textTransform: 'capitalize', fontSize: '0.875rem', fontWeight: 500 }}
          >
            {seg.label}
          </SoftTypography>
        </Link>
      ))}
      <SoftTypography
        component="span"
        variant="button"
        sx={{ color: ORANGE, textTransform: 'capitalize', fontSize: '0.875rem', fontWeight: 600 }}
      >
        {simpleTitle ?? last.label}
      </SoftTypography>
    </SoftBox>
  );
}

function TabbedBreadcrumbs({ config }: { config: BreadcrumbConfig }) {
  const { pageName, pageHref, tabs, activeTabIndex } = config;

  /** Page-only: show the section title as the primary crumb (no duplicate tab links). */
  if (activeTabIndex === null) {
    return (
      <SoftBox component="span" display="inline-flex" alignItems="center" flexWrap="wrap" gap={1} sx={{ minWidth: 0 }}>
        <Link to={pageHref} style={{ textDecoration: 'none' }}>
          <SoftTypography component="span" variant="button" sx={{ color: ORANGE, fontSize: '0.875rem', fontWeight: 600 }}>
            {pageName}
          </SoftTypography>
        </Link>
      </SoftBox>
    );
  }

  const current = tabs[activeTabIndex];
  if (!current) {
    return null;
  }

  return (
    <SoftBox component="span" display="inline-flex" alignItems="center" flexWrap="wrap" gap={1} sx={{ minWidth: 0 }}>
      <Link to={pageHref} style={{ textDecoration: 'none' }}>
        <SoftTypography component="span" variant="button" sx={{ color: BLUE, fontSize: '0.875rem', fontWeight: 500 }}>
          {pageName}
        </SoftTypography>
      </Link>
      <SoftTypography component="span" variant="button" sx={{ color: ORANGE, fontSize: '0.875rem', fontWeight: 600 }}>
        {current.label}
      </SoftTypography>
    </SoftBox>
  );
}

interface WPHubBreadcrumbsProps {
  light?: boolean;
  simpleTitle: string | null;
  breadcrumbConfig: BreadcrumbConfig | null;
}

const WPHubBreadcrumbs: React.FC<WPHubBreadcrumbsProps> = ({ light, simpleTitle, breadcrumbConfig }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const sepColor = light ? 'rgba(255,255,255,0.55)' : 'grey.500';

  const showTabbed = breadcrumbConfig && breadcrumbConfig.tabs.length > 0;

  return (
    <SoftBox mr={{ xs: 0, xl: 4 }} sx={{ minWidth: 0, flex: 1 }}>
      <MuiBreadcrumbs
        separator={
          <SoftTypography component="span" sx={{ color: sepColor, px: 0.25, fontSize: '0.875rem' }}>
            /
          </SoftTypography>
        }
        sx={{
          flexWrap: 'wrap',
          alignItems: 'center',
          '& .MuiBreadcrumbs-separator': { mx: 0.25 },
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          <SoftTypography
            component="span"
            variant="body2"
            sx={{
              lineHeight: 0,
              color: light ? 'white' : ORANGE,
              opacity: light ? 0.95 : 1,
            }}
          >
            <Icon sx={{ color: light ? 'white' : ORANGE, fontSize: 22 }}>home</Icon>
          </SoftTypography>
        </Link>

        {showTabbed ? (
          <TabbedBreadcrumbs config={breadcrumbConfig} />
        ) : (
          <FallbackPathBreadcrumbs pathname={pathname} simpleTitle={simpleTitle} />
        )}
      </MuiBreadcrumbs>
    </SoftBox>
  );
};

export default WPHubBreadcrumbs;
