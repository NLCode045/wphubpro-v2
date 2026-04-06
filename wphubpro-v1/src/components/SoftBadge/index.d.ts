import type { BadgeProps } from '@mui/material/Badge';

export interface SoftBadgeProps extends Omit<BadgeProps, 'variant' | 'color'> {
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'light' | 'dark';
  variant?: 'gradient' | 'contained';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  circular?: boolean;
  indicator?: boolean;
  border?: boolean;
  container?: boolean;
  badgeContent?: React.ReactNode;
  children?: React.ReactNode;
}

declare const SoftBadge: React.ForwardRefExoticComponent<SoftBadgeProps & React.RefAttributes<HTMLSpanElement>>;
export default SoftBadge;
