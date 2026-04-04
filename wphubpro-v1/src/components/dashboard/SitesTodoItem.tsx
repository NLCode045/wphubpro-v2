/**
 * Site todo item adapted from soft projects/general Todo
 * Renders as link when `to` is provided
 */
import React, { useState } from 'react';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Icon from '@mui/material/Icon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Link, useNavigate } from 'react-router-dom';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';

import borders from 'assets/theme/base/borders';
import colors from 'assets/theme/base/colors';

type ColorType = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'dark';

interface SitesTodoItemProps {
  color?: ColorType;
  title: string;
  date: string;
  project: string;
  company: string;
  defaultChecked?: boolean;
  noDivider?: boolean;
  to?: string;
}

const SitesTodoItem: React.FC<SitesTodoItemProps> = ({
  color = 'info',
  title,
  date,
  project,
  company,
  defaultChecked = false,
  noDivider = false,
  to,
}) => {
  const { borderWidth } = borders;
  const [openMenu, setOpenMenu] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) =>
    setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(null);
  const handleViewSite = () => {
    handleCloseMenu();
    if (to) navigate(to);
  };

  const colorEntry = colors[color as keyof typeof colors];
  const borderColor =
    colorEntry && typeof colorEntry === 'object' && 'main' in colorEntry
      ? (colorEntry as { main: string }).main
      : (colors.info as { main: string }).main;

  const content = (
    <SoftBox width="100%" pl={1} ml={2}>
      <SoftBox display="flex" alignItems="center">
        <Checkbox defaultChecked={defaultChecked} disabled sx={{ pointerEvents: 'none' }} />
        <SoftBox ml={0.2} lineHeight={1} flex={1}>
          {to ? (
            <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
              <SoftTypography variant="button" fontWeight="medium">
                {title}
              </SoftTypography>
            </Link>
          ) : (
            <SoftTypography variant="button" fontWeight="medium">
              {title}
            </SoftTypography>
          )}
        </SoftBox>
        <SoftBox ml="auto" color="secondary" pr={3} lineHeight={0}>
          <Icon fontSize="medium" sx={{ cursor: 'pointer' }} onClick={handleOpenMenu}>
            more_horiz
          </Icon>
        </SoftBox>
        <Menu
          anchorEl={openMenu}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={Boolean(openMenu)}
          onClose={handleCloseMenu}
          keepMounted
        >
          <MenuItem onClick={handleViewSite}>Bekijk site</MenuItem>
        </Menu>
      </SoftBox>
      <SoftBox
        display="flex"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        mt={2}
        ml={3}
        pl={0.5}
      >
        <SoftBox lineHeight={1} mb={{ xs: 1, sm: 0 }}>
          <SoftTypography display="block" variant="caption" fontWeight="medium" color="secondary">
            Last checked
          </SoftTypography>
          <SoftTypography variant="caption" fontWeight="bold" color="text">
            {date}
          </SoftTypography>
        </SoftBox>
        <SoftBox ml={{ xs: 0, sm: 'auto' }} mb={{ xs: 1, sm: 0 }} lineHeight={1}>
          <SoftTypography display="block" variant="caption" fontWeight="medium" color="secondary">
            URL
          </SoftTypography>
          <SoftTypography variant="caption" fontWeight="bold" color="text">
            {project}
          </SoftTypography>
        </SoftBox>
        <SoftBox mx={{ xs: 0, sm: 'auto' }} lineHeight={1}>
          <SoftTypography display="block" variant="caption" fontWeight="medium" color="secondary">
            WP version
          </SoftTypography>
          <SoftTypography variant="caption" fontWeight="bold" color="text">
            {company}
          </SoftTypography>
        </SoftBox>
      </SoftBox>
    </SoftBox>
  );

  return (
    <SoftBox
      component="li"
      width="100%"
      pr={2}
      mb={2}
      borderLeft={`${borderWidth[3]} solid ${borderColor}`}
      sx={{ listStyle: 'none' }}
    >
      {content}
      {noDivider ? null : <Divider sx={{ marginBottom: 0 }} />}
    </SoftBox>
  );
};

export default SitesTodoItem;
