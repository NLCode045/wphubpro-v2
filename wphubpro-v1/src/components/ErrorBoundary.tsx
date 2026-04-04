/**
 * Error boundary to catch React render errors and display fallback UI
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftTypography from 'components/SoftTypography';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <SoftBox p={3} sx={{ bgcolor: 'error.light', borderRadius: 1 }}>
          <SoftTypography variant="h6" color="error" gutterBottom>
            Er is iets misgegaan
          </SoftTypography>
          <SoftTypography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', mb: 2 }}>
            {this.state.error.message}
          </SoftTypography>
          <SoftButton variant="outlined" size="small" onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </SoftButton>
        </SoftBox>
      );
    }
    return this.props.children;
  }
}
