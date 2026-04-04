import type { BoxProps } from '@mui/material/Box';
import type { TypographyProps } from '@mui/material/Typography';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';

// Soft UI theme augmentation: our theme includes custom functions (pxToRem, etc.)
declare module '@mui/material/styles' {
  interface Theme {
    functions: {
      pxToRem: (value: number, baseNumber?: number) => string;
      [key: string]: unknown;
    };
  }
}

// React 19 compatibility: MUI v5 types don't include children in polymorphic components
declare module '@mui/material/Button' {
  interface ButtonProps {
    children?: ReactNode;
  }
}

declare module '@mui/material/Link' {
  interface LinkProps {
    children?: ReactNode;
  }
}

declare module 'components/SoftBox' {
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
  const SoftBox: ForwardRefExoticComponent<SoftBoxProps & RefAttributes<HTMLDivElement>>;
  export default SoftBox;
}

declare module 'components/SoftTypography' {
  export interface SoftTypographyProps extends TypographyProps {
    color?: 'inherit' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'light' | 'dark' | 'text' | 'white';
    fontWeight?: false | 'light' | 'regular' | 'medium' | 'bold';
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
    verticalAlign?: 'unset' | 'baseline' | 'sub' | 'super' | 'text-top' | 'text-bottom' | 'middle' | 'top' | 'bottom';
    textGradient?: boolean;
    opacity?: number;
    children?: ReactNode;
  }
  const SoftTypography: ForwardRefExoticComponent<SoftTypographyProps & RefAttributes<HTMLSpanElement>>;
  export default SoftTypography;
}

declare module 'components/SoftAvatar' {
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

  const SoftAvatar: ForwardRefExoticComponent<SoftAvatarProps & RefAttributes<HTMLDivElement>>;
  export default SoftAvatar;
}

declare module 'components/SoftButton' {
  import type { ElementType } from 'react';

  export interface SoftButtonProps {
    variant?: 'text' | 'contained' | 'outlined' | 'gradient';
    color?: 'white' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'light' | 'dark';
    size?: 'small' | 'medium' | 'large';
    circular?: boolean;
    iconOnly?: boolean;
    children?: ReactNode;
    component?: ElementType;
    fullWidth?: boolean;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    href?: string;
    to?: string;
    target?: string;
    rel?: string;
    sx?: object;
    className?: string;
  }

  const SoftButton: ForwardRefExoticComponent<SoftButtonProps & RefAttributes<HTMLButtonElement>>;
  export default SoftButton;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}
