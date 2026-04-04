import { BoxProps } from '@mui/material/Box';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

export interface SoftBoxProps extends BoxProps {
  variant?: 'contained' | 'gradient';
  bgColor?: string;
  color?: string;
  opacity?: number;
  borderRadius?: string;
  shadow?: string;
  // Allow polymorphic component props (e.g. component="button", component="img")
  [key: string]: unknown;
}

declare const SoftBox: ForwardRefExoticComponent<SoftBoxProps & RefAttributes<HTMLDivElement>>;

export default SoftBox;
