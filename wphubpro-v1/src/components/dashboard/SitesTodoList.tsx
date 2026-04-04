/**
 * Sites list adapted from soft projects/general TodoList
 * Shows sites as todo items with link to site detail
 */
import React from 'react';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { Link } from 'react-router-dom';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';

import SitesTodoItem from './SitesTodoItem';
import { Site } from '../../types';

interface SitesTodoListProps {
  sites: Site[];
}

const SitesTodoList: React.FC<SitesTodoListProps> = ({ sites }) => {
  const getHealthColor = (
    healthStatus: Site['healthStatus']
  ): 'success' | 'warning' | 'error' | 'info' => {
    if (healthStatus === 'healthy') return 'success';
    return 'error';
  };

  return (
    <Card>
      <SoftBox display="flex" justifyContent="space-between" alignItems="center" pt={2} px={2}>
        <SoftTypography variant="h6" fontWeight="medium">
          To do list — Sites
        </SoftTypography>
        <Link to="/sites">
          <SoftTypography variant="button" fontWeight="regular" color="info">
            Alle sites
          </SoftTypography>
        </Link>
      </SoftBox>
      <Divider />
      <SoftBox pb={2} px={2}>
        <SoftBox component="ul" display="flex" flexDirection="column" p={0} m={0}>
          {sites.length === 0 ? (
            <SoftBox py={3}>
              <SoftTypography variant="caption" color="secondary">
                No sites yet. Add your first WordPress site.
              </SoftTypography>
            </SoftBox>
          ) : (
            sites.slice(0, 5).map((site, index) => (
              <SitesTodoItem
                key={site.$id}
                title={site.siteName || site.siteUrl || site.$id}
                date={site.lastChecked ? new Date(site.lastChecked).toLocaleDateString('nl-NL') : '-'}
                project={site.siteUrl}
                company={`WP ${site.wpVersion ?? '-'}`}
                color={getHealthColor(site.healthStatus)}
                defaultChecked={site.healthStatus === 'healthy'}
                noDivider={index === Math.min(4, sites.length - 1)}
                to={`/sites/${site.$id}`}
              />
            ))
          )}
        </SoftBox>
      </SoftBox>
    </Card>
  );
};

export default SitesTodoList;
