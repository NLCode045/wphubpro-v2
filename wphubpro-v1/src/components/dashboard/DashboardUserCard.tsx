/**
 * Dashboard user details card - Name, email, role, member since, avatar, buttons
 */
import React from 'react';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Avatar from '@mui/material/Avatar';
import Icon from '@mui/material/Icon';
import { Link } from 'react-router-dom';
import { avatars } from '../../services/appwrite';
import { User } from '../../types';
import { ROUTE_PATHS } from '../../config/routePaths';

interface DashboardUserCardProps {
  user: User | null;
}

const getAvatarUrl = (user: User | null): string | undefined => {
  if (!user?.$id) return undefined;
  try {
    const url = avatars.getInitials(
      (user.name || user.email || 'U').substring(0, 2).toUpperCase(),
      200,
      200,
    );
    return url.toString();
  } catch {
    return undefined;
  }
};

const DashboardUserCard: React.FC<DashboardUserCardProps> = ({ user }) => {
  const avatarUrl = getAvatarUrl(user);
  const rawUser = user as { $createdAt?: string } | null;
  const memberSince = rawUser?.$createdAt
    ? new Date(rawUser.$createdAt).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    : '-';
  const role = (user as { isAdmin?: boolean })?.isAdmin ? 'Admin' : 'Member';

  return (
    <Card>
      <SoftBox p={2}>
        <SoftBox display="flex" alignItems="center" gap={1.5} mb={1.5}>
          <Avatar
            src={avatarUrl}
            alt={user?.name || 'avatar'}
            sx={{
              bgcolor: 'info.main',
              width: 48,
              height: 48,
              borderRadius: 1,
            }}
          />
          <SoftBox flex={1} minWidth={0}>
            <SoftTypography variant="button" fontWeight="medium" noWrap>
              {user?.name || user?.email || 'User'}
            </SoftTypography>
            {user?.email ? (
              <a href={`mailto:${user.email}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <SoftTypography variant="caption" color="secondary" display="block" noWrap sx={{ '&:hover': { textDecoration: 'underline' } }}>
                  {user.email}
                </SoftTypography>
              </a>
            ) : (
              <SoftTypography variant="caption" color="secondary" display="block" noWrap>
                -
              </SoftTypography>
            )}
            <SoftTypography variant="caption" color="secondary">
              {role} · Member since {memberSince}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
        <SoftBox display="flex" gap={1}>
          <SoftButton variant="contained" color="info" size="small" component={Link} to={ROUTE_PATHS.ACCOUNT_PROFILE}>
            <Icon sx={{ mr: 0.5, fontSize: 16 }}>person</Icon>
            Profile
          </SoftButton>
          <SoftButton variant="outlined" color="info" size="small" component={Link} to={ROUTE_PATHS.ACCOUNT_EDIT}>
            <Icon sx={{ mr: 0.5, fontSize: 16 }}>edit</Icon>
            Bewerken
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Card>
  );
};

export default DashboardUserCard;
