import { TypographyProps } from '@mui/material/Typography';
import { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';

export interface SoftTypographyProps extends TypographyProps {
  color?: 'inherit' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'light' | 'dark' | 'text' | 'white';
  fontWeight?: false | 'light' | 'regular' | 'medium' | 'bold';
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  verticalAlign?: 'unset' | 'baseline' | 'sub' | 'super' | 'text-top' | 'text-bottom' | 'middle' | 'top' | 'bottom';
  textGradient?: boolean;
  opacity?: number;
  children?: ReactNode;
}

declare const SoftTypography: ForwardRefExoticComponent<SoftTypographyProps & RefAttributes<HTMLSpanElement>>;

export default SoftTypography;
