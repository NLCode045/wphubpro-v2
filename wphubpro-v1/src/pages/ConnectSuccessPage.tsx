/**
 * Connect Success page - handles callback from WordPress plugin
 * New flow: ?site_url=...&user_login=...&connect_token=... (token exchanged for bridge_secret)
 * Legacy: ?site_url=...&user_login=...&api_key=...
 */
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftTypography from 'components/SoftTypography';
import Icon from '@mui/material/Icon';

import { useAuth } from '../domains/auth';
import { useSites, useAddSite, useUpdateSite } from '../domains/sites';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_HEARTBEAT_URL } from '../services/appwrite';

/** Fetch bridge_secret from WordPress via one-time token exchange. */
async function exchangeToken(siteUrl: string, connectToken: string): Promise<string> {
  const base = siteUrl.replace(/\/$/, '');
  const url = `${base}/wp-json/wphubpro/v1/exchange-token?connect_token=${encodeURIComponent(connectToken)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string })?.message || `Token exchange failed: ${res.status}`);
  }
  const data = (await res.json()) as { bridge_secret?: string };
  if (!data?.bridge_secret) throw new Error('No bridge_secret in response');
  return data.bridge_secret;
}

/** Save connection data to WordPress bridge. New flow: bridge_secret + site_secret. Legacy: api_key. */
async function saveConnectionToWordPress(
  siteUrl: string,
  bridgeSecret: string,
  siteId: string,
  siteSecret?: string,
  encryptedApiKey?: string,
  wpAdminUsername?: string
): Promise<void> {
  const base = siteUrl.replace(/\/$/, '');
  const url = `${base}/wp-json/wphubpro/v1/save-connection`;
  try {
    const body: Record<string, unknown> = {
      bridge_secret: bridgeSecret,
      endpoint: APPWRITE_ENDPOINT,
      project_id: APPWRITE_PROJECT_ID,
      site_id: siteId,
      heartbeat_url: APPWRITE_HEARTBEAT_URL || undefined,
    };
    if (siteSecret) body.site_secret = siteSecret;
    if (encryptedApiKey) body.encrypted_api_key = encryptedApiKey;
    if (wpAdminUsername && wpAdminUsername.trim()) body.username = wpAdminUsername.trim();
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WPHub-Key': bridgeSecret,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Silently ignore - connection still works
  }
}

const normalizeUrl = (url: string) => {
  const s = (url || '').trim();
  if (!s) return '';
  try {
    return s.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  } catch {
    return s;
  }
};

const ConnectSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: sites, isLoading: sitesLoading } = useSites();
  const addSite = useAddSite();
  const updateSite = useUpdateSite();
  const processed = useRef(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const siteUrl = searchParams.get('site_url') || '';
  const userLogin = searchParams.get('user_login') || '';
  const connectToken = searchParams.get('connect_token') || '';
  const apiKeyLegacy = searchParams.get('api_key') || '';

  const isNewFlow = !!connectToken;

  useEffect(() => {
    if (processed.current || authLoading || sitesLoading || !user) return;
    if (!siteUrl || (!connectToken && !apiKeyLegacy)) {
      processed.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }
    const sitesList = Array.isArray(sites) ? sites : [];
    const normalized = normalizeUrl(siteUrl);
    if (!normalized) {
      processed.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }
    const existing = sitesList.find((s) => {
      const existingNorm = normalizeUrl(s.siteUrl || '');
      return existingNorm && existingNorm === normalized;
    });
    const fullSiteUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    const doNavigate = () => navigate('/sites', { replace: true });

    const runWithBridgeSecret = (bridgeSecret: string) => {
      processed.current = true;
      const siteName = (() => {
        try {
          return new URL(siteUrl).hostname || siteUrl;
        } catch {
          return siteUrl;
        }
      })();

      if (existing) {
        updateSite.mutate(
          { siteId: existing.$id, apiKey: bridgeSecret, bridgeSecret: bridgeSecret },
          {
            onSuccess: (data) => {
              const siteSecret = (data as { siteSecret?: string })?.siteSecret ?? (data as { site_secret?: string })?.site_secret;
              const encryptedKey = (data as { encrypted_api_key?: string })?.encrypted_api_key;
              saveConnectionToWordPress(
                fullSiteUrl,
                bridgeSecret,
                existing.$id,
                siteSecret,
                encryptedKey
              ).then(doNavigate);
            },
            onError: () => {},
          }
        );
      } else {
        addSite.mutate(
          {
            siteUrl: siteUrl.replace(/\/$/, ''),
            siteName,
            username: userLogin,
            apiKey: bridgeSecret,
            bridgeSecret,
          },
          {
            onSuccess: (data) => {
              const newSiteId = data?.$id;
              const siteSecret = (data as { siteSecret?: string })?.siteSecret ?? (data as { site_secret?: string })?.site_secret;
              const encryptedKey = (data as { encrypted_api_key?: string })?.encrypted_api_key;
              if (newSiteId) {
                saveConnectionToWordPress(
                  fullSiteUrl,
                  bridgeSecret,
                  newSiteId,
                  siteSecret,
                  encryptedKey,
                  userLogin || undefined
                ).then(doNavigate);
              } else {
                doNavigate();
              }
            },
            onError: () => {},
          }
        );
      }
    };

    if (isNewFlow) {
      exchangeToken(fullSiteUrl, connectToken)
        .then(runWithBridgeSecret)
        .catch((err) => {
          processed.current = true;
          setTokenError(err?.message || 'Token exchange failed');
        });
    } else {
      runWithBridgeSecret(apiKeyLegacy);
    }
  }, [user, authLoading, sitesLoading, sites, siteUrl, connectToken, apiKeyLegacy, userLogin, navigate, addSite, updateSite]);

  if (authLoading || !user) {
    return (
      <SoftBox sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', p: 4 }}>
        <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}>hourglass_empty</Icon>
        <SoftTypography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>Even geduld…</SoftTypography>
        <SoftTypography variant="body2" color="secondary">Log in to complete the connection.</SoftTypography>
        <SoftButton variant="contained" color="primary" size="small" sx={{ mt: 3 }} onClick={() => navigate('/login')}>
          Inloggen
        </SoftButton>
      </SoftBox>
    );
  }

  if (!siteUrl || (!connectToken && !apiKeyLegacy)) {
    return (
      <SoftBox sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', p: 4 }}>
        <Icon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }}>warning</Icon>
        <SoftTypography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>Ongeldige callback</SoftTypography>
        <SoftTypography variant="body2" color="secondary" sx={{ mb: 2 }}>Missing site_url or connect_token/api_key.</SoftTypography>
        <SoftButton variant="contained" color="primary" size="small" onClick={() => navigate('/dashboard')}>
          Naar dashboard
        </SoftButton>
      </SoftBox>
    );
  }

  if (tokenError) {
    return (
      <SoftBox sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', p: 4 }}>
        <Icon sx={{ fontSize: 48, color: 'error.main', mb: 2 }}>error</Icon>
        <SoftTypography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>Token exchange failed</SoftTypography>
        <SoftTypography variant="body2" color="secondary" sx={{ mb: 2 }}>{tokenError}</SoftTypography>
        <SoftButton variant="contained" color="primary" size="small" onClick={() => navigate('/dashboard')}>
          Naar dashboard
        </SoftButton>
      </SoftBox>
    );
  }

  const isPending = addSite.isPending || updateSite.isPending;
  const isError = addSite.isError || updateSite.isError;

  if (isError) {
    const err = addSite.error || updateSite.error;
    return (
      <SoftBox sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', p: 4 }}>
        <Icon sx={{ fontSize: 48, color: 'error.main', mb: 2 }}>error</Icon>
        <SoftTypography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>Connection failed</SoftTypography>
        <SoftTypography variant="body2" color="secondary" sx={{ mb: 2 }}>{err?.message}</SoftTypography>
        <SoftButton variant="contained" color="primary" size="small" onClick={() => navigate('/sites')}>
          Naar sites
        </SoftButton>
      </SoftBox>
    );
  }

  return (
    <SoftBox sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', p: 4 }}>
      <Icon sx={{ fontSize: 48, color: isPending ? 'info.main' : 'success.main', mb: 2 }}>
        {isPending ? 'sync' : 'check_circle'}
      </Icon>
      <SoftTypography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>
        {isPending ? 'Site koppelen…' : 'Site gekoppeld!'}
      </SoftTypography>
      <SoftTypography variant="body2" color="secondary">
        {isPending ? 'Saving connection…' : 'Redirecting to sites.'}
      </SoftTypography>
    </SoftBox>
  );
};

export default ConnectSuccessPage;
