import type { ElementType, ReactNode } from 'react';
import type { ButtonProps } from '@mui/material/Button';

export interface SoftButtonProps extends Omit<ButtonProps, 'variant' | 'color' | 'size'> {
  variant?: 'text' | 'contained' | 'outlined' | 'gradient';
  color?: 'white' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
  circular?: boolean;
  iconOnly?: boolean;
  children?: ReactNode;
}

declare const SoftButton: React.ForwardRefExoticComponent<SoftButtonProps & React.RefAttributes<HTMLButtonElement>>;
export default SoftButton;
