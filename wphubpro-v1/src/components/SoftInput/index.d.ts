import type { InputBaseProps } from '@mui/material/InputBase';

export interface SoftInputProps extends InputBaseProps {
  size?: 'small' | 'medium' | 'large';
  icon?: {
    component?: React.ReactNode | false;
    direction?: 'none' | 'left' | 'right';
  };
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  inputProps?: Record<string, unknown>;
}

declare const SoftInput: React.ForwardRefExoticComponent<SoftInputProps & React.RefAttributes<HTMLDivElement>>;
export default SoftInput;
