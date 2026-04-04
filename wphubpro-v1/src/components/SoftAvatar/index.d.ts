import type { AvatarProps } from '@mui/material/Avatar';

export interface SoftAvatarProps extends Omit<AvatarProps, 'variant'> {
  bgColor?: 'transparent' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'light' | 'dark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  shadow?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'inset';
  variant?: 'rounded' | 'square' | 'circular';
  src?: string;
  alt?: string;
  name?: string;
  sx?: Record<string, unknown>;
}

declare const SoftAvatar: React.ForwardRefExoticComponent<SoftAvatarProps & React.RefAttributes<HTMLDivElement>>;
export default SoftAvatar;
