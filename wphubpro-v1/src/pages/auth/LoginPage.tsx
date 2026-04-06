import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { useAuth } from '../../domains/auth';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';
import SoftTypography from 'components/SoftTypography';
import { AlertCircle, Github } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGitHub } = useAuth();
  const { data: details } = usePlatformSettings('details');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  };

  const platformName = details?.name || 'WPHub.PRO';
  const logoUrl = details?.logoUrl || details?.logoDataUrl;

  return (
    <SoftBox
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        backgroundColor: 'background.default',
        py: 4,
        px: 2,
      }}
    >
      <SoftBox width="100%" maxWidth={420} mx="auto">
        {/* Brand */}
        <SoftBox display="flex" justifyContent="center" alignItems="center" gap={1.5} mb={3}>
          {logoUrl ? (
            <SoftBox component="img" src={logoUrl} alt="Logo" width={48} height={48} sx={{ objectFit: 'contain' }} />
          ) : (
            <SoftBox
              width={48}
              height={48}
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{ background: 'linear-gradient(310deg, #4F5482, #7a8ef0)' }}
            >
              <Icon sx={{ color: 'white', fontSize: 28 }}>layers</Icon>
            </SoftBox>
          )}
          <SoftTypography variant="h4" fontWeight="bold" color="dark">
            {platformName}
          </SoftTypography>
        </SoftBox>

        {/* Card */}
        <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 2 }}>
          <SoftBox p={3}>
            <SoftBox textAlign="center" mb={3}>
              <SoftTypography variant="h5" fontWeight="bold" color="dark" gutterBottom>
                Welcome Back
              </SoftTypography>
              <SoftTypography variant="body2" color="text">
                Enter your credentials to access your account.
              </SoftTypography>
            </SoftBox>

            <SoftBox component="form" onSubmit={handleSubmit}>
              {error && (
                <SoftBox
                  mb={2}
                  p={2}
                  borderRadius="1"
                  display="flex"
                  alignItems="center"
                  gap={1}
                  sx={{ bgcolor: 'error.main', color: 'white', fontSize: '14px' }}
                >
                  <AlertCircle size="20" style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </SoftBox>
              )}

              <SoftBox mb={2}>
                <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>
                  Email
                </SoftTypography>
                <SoftInput
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
              </SoftBox>

              <SoftBox mb={3}>
                <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <SoftTypography variant="caption" fontWeight="medium" color="text">
                    Password
                  </SoftTypography>
                  <Link
                    to="/forgot-password"
                    title="Coming Soon"
                    style={{ fontSize: 12, color: '#f97316', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Forgot password?
                  </Link>
                </SoftBox>
                <SoftInput
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                />
              </SoftBox>

              <SoftButton
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isLoading}
                sx={{ py: 1.5, mb: 2 }}
              >
                {isLoading ? (
                  <SoftBox display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <CircularProgress size={18} sx={{ color: 'white' }} />
                    <span>Logging in...</span>
                  </SoftBox>
                ) : (
                  'Log In'
                )}
              </SoftButton>

              <SoftBox display="flex" alignItems="center" gap={1.5} mb={2}>
                <Divider sx={{ flex: 1 }} />
                <SoftTypography variant="caption" color="text" fontWeight="medium">
                  or
                </SoftTypography>
                <Divider sx={{ flex: 1 }} />
              </SoftBox>

              <SoftButton
                type="button"
                variant="outlined"
                color="dark"
                fullWidth
                onClick={loginWithGitHub}
                sx={{
                  py: 1.5,
                  mb: 2,
                  borderColor: 'grey.400',
                  '&:hover': { borderColor: 'grey.600', bgcolor: 'grey.50' },
                }}
              >
                <Github size={20} style={{ marginRight: 8 }} />
                Continue with GitHub
              </SoftButton>

              <SoftTypography variant="caption" textAlign="center" color="text" display="block">
                Don&apos;t have an account?{' '}
                <Link to="/register" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>
                  Sign up
                </Link>
              </SoftTypography>
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>
    </SoftBox>
  );
};

export default LoginPage;
