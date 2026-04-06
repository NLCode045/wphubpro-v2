import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../../domains/auth';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftInput from 'components/SoftInput';
import SoftButton from 'components/SoftButton';
import Socials from 'layouts/authentication/components/Socials';
import Separator from 'layouts/authentication/components/Separator';
import Footer from 'layouts/authentication/components/Footer';
import curved6 from 'assets/images/curved-images/curved6.jpg';
import { AlertCircle } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreement, setAgreement] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { data: details } = usePlatformSettings('details');

  const handleSetAgreement = () => setAgreement(!agreement);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await register(name, email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
    }
  };

  const platformName = details?.name || 'WPHub.PRO';

  return (
    <SoftBox width="100%" minHeight="100vh" sx={{ overflowX: 'hidden' }}>
      {/* Hero with curved image */}
      <SoftBox
        width="calc(100% - 2rem)"
        minHeight="50vh"
        borderRadius="lg"
        mx={2}
        my={2}
        pt={6}
        pb={28}
        sx={{
          backgroundImage: `linear-gradient(195deg, rgba(66,66,66,0.6) 0%, rgba(33,37,41,0.6) 100%), url(${curved6})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Grid container spacing={3} justifyContent="center" sx={{ textAlign: 'center' }}>
          <Grid item xs={10} lg={4}>
            <SoftBox mt={6} mb={1}>
              <SoftTypography variant="h1" color="white" fontWeight="bold">
                Welcome!
              </SoftTypography>
            </SoftBox>
            <SoftBox mb={2}>
              <SoftTypography variant="body2" color="white" fontWeight="regular">
                Create your {platformName} account and get started for free.
              </SoftTypography>
            </SoftBox>
          </Grid>
        </Grid>
      </SoftBox>
      {/* Card */}
      <SoftBox mt={{ xs: -26, lg: -24 }} px={1} width="calc(100% - 2rem)" mx="auto">
        <Grid container spacing={1} justifyContent="center">
          <Grid item xs={11} sm={9} md={5} lg={4} xl={3}>
            <Card>
              <SoftBox p={3} mb={1} textAlign="center">
                <SoftTypography variant="h5" fontWeight="medium">
                  Register with
                </SoftTypography>
              </SoftBox>
              <SoftBox mb={2}>
                <Socials />
              </SoftBox>
              <Separator />
              <SoftBox pt={2} pb={3} px={3}>
          <SoftBox component="form" role="form" onSubmit={handleSubmit}>
            {error && (
              <SoftBox
                mb={2}
                p={2}
                borderRadius="md"
                display="flex"
                alignItems="center"
                gap={1}
                sx={{ bgcolor: 'error.main', color: 'white', fontSize: '14px' }}
              >
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </SoftBox>
            )}
            <SoftBox mb={2}>
              <SoftInput
                placeholder="Name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
              />
            </SoftBox>
            <SoftBox mb={2}>
              <SoftInput
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </SoftBox>
            <SoftBox mb={2}>
              <SoftInput
                type="password"
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
              />
            </SoftBox>
            <SoftBox display="flex" alignItems="center">
              <Checkbox checked={agreement} onChange={handleSetAgreement} />
              <SoftTypography
                variant="button"
                fontWeight="regular"
                onClick={handleSetAgreement}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
              >
                &nbsp;&nbsp;I agree the&nbsp;
              </SoftTypography>
              <SoftTypography
                {...({ component: 'a', href: '#' } as React.ComponentProps<typeof SoftTypography>)}
                variant="button"
                fontWeight="bold"
                textGradient
              >
                Terms and Conditions
              </SoftTypography>
            </SoftBox>
            <SoftBox mt={4} mb={1}>
              <SoftButton
                type="submit"
                variant="gradient"
                color="dark"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? (
                  <SoftBox display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <CircularProgress size={18} sx={{ color: 'white' }} />
                    <span>Creating account...</span>
                  </SoftBox>
                ) : (
                  'Sign up'
                )}
              </SoftButton>
            </SoftBox>
            <SoftBox mt={3} textAlign="center">
              <SoftTypography variant="button" color="text" fontWeight="regular">
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </SoftTypography>
            </SoftBox>
          </SoftBox>
        </SoftBox>
      </Card>
          </Grid>
        </Grid>
      </SoftBox>
      <Footer />
    </SoftBox>
  );
};

export default RegisterPage;
