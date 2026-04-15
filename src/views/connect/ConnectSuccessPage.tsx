/**
 * Connect Success page — callback from WordPress bridge after OAuth/connect.
 * New flow: `?site_url=...&user_login=...&connect_token=...` (exchanged for bridge_secret).
 * Legacy: `?site_url=...&user_login=...&api_key=...`
 */
import { ROUTE_PATHS } from '@/config/routePaths';
import { useAuth } from '@/domains/auth';
import { useAddSite, useSites, useUpdateSite } from '@/domains/sites';
import { APPWRITE_ENDPOINT, APPWRITE_HEARTBEAT_URL, APPWRITE_PROJECT_ID } from '@/services/appwrite';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Container, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router';

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
  wpAdminUsername?: string,
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
    /* Silently ignore — hub connection still works */
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

  const isNewFlow = Boolean(connectToken);

  useEffect(() => {
    if (processed.current || authLoading || sitesLoading || !user) return;
    if (!siteUrl || (!connectToken && !apiKeyLegacy)) {
      processed.current = true;
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
      return;
    }
    const sitesList = Array.isArray(sites) ? sites : [];
    const normalized = normalizeUrl(siteUrl);
    if (!normalized) {
      processed.current = true;
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
      return;
    }
    const existing = sitesList.find((s) => {
      const existingNorm = normalizeUrl(s.siteUrl || '');
      return existingNorm && existingNorm === normalized;
    });
    const fullSiteUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    const doNavigate = () => navigate(ROUTE_PATHS.SITES, { replace: true });

    const runWithBridgeSecret = (bridgeSecret: string) => {
      processed.current = true;
      const siteName = (() => {
        try {
          return new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`).hostname || siteUrl;
        } catch {
          return siteUrl;
        }
      })();

      if (existing) {
        updateSite.mutate(
          {
            siteId: existing.$id,
            apiKey: bridgeSecret,
            bridgeSecret,
            silent: true,
          },
          {
            onSuccess: (data) => {
              const siteSecret =
                (data as { siteSecret?: string })?.siteSecret ??
                (data as { site_secret?: string })?.site_secret;
              const encryptedKey = (data as { encrypted_api_key?: string })?.encrypted_api_key;
              void saveConnectionToWordPress(
                fullSiteUrl,
                bridgeSecret,
                existing.$id,
                siteSecret,
                encryptedKey,
              ).then(doNavigate);
            },
            onError: () => {},
          },
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
              const siteSecret =
                (data as { siteSecret?: string })?.siteSecret ??
                (data as { site_secret?: string })?.site_secret;
              const encryptedKey = (data as { encrypted_api_key?: string })?.encrypted_api_key;
              if (newSiteId) {
                void saveConnectionToWordPress(
                  fullSiteUrl,
                  bridgeSecret,
                  newSiteId,
                  siteSecret,
                  encryptedKey,
                  userLogin || undefined,
                ).then(doNavigate);
              } else {
                doNavigate();
              }
            },
            onError: () => {},
          },
        );
      }
    };

    if (isNewFlow) {
      void exchangeToken(fullSiteUrl, connectToken)
        .then(runWithBridgeSecret)
        .catch((err: Error) => {
          processed.current = true;
          setTokenError(err?.message || 'Token exchange failed');
        });
    } else {
      runWithBridgeSecret(apiKeyLegacy);
    }
  }, [
    user,
    authLoading,
    sitesLoading,
    sites,
    siteUrl,
    connectToken,
    apiKeyLegacy,
    userLogin,
    navigate,
    addSite,
    updateSite,
    isNewFlow,
  ]);

  if (authLoading || !user) {
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="secondary" className="mb-3" />
        <h5 className="mb-1">Even geduld…</h5>
        <p className="text-muted mb-3">Log in to complete the connection.</p>
        <Button variant="primary" size="sm" onClick={() => navigate(ROUTE_PATHS.LOGIN)}>
          Inloggen
        </Button>
      </Container>
    );
  }

  if (!siteUrl || (!connectToken && !apiKeyLegacy)) {
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <i className="ri-alert-line text-warning fs-1 mb-3" aria-hidden />
        <h5 className="mb-1">Ongeldige callback</h5>
        <p className="text-muted text-center mb-3">Missing site_url or connect_token/api_key.</p>
        <Button variant="primary" size="sm" onClick={() => navigate(ROUTE_PATHS.DASHBOARD)}>
          Naar dashboard
        </Button>
      </Container>
    );
  }

  if (tokenError) {
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <i className="ri-error-warning-line text-danger fs-1 mb-3" aria-hidden />
        <h5 className="mb-1">Token exchange failed</h5>
        <p className="text-muted text-center mb-3">{tokenError}</p>
        <Button variant="primary" size="sm" onClick={() => navigate(ROUTE_PATHS.DASHBOARD)}>
          Naar dashboard
        </Button>
      </Container>
    );
  }

  const isPending = addSite.isPending || updateSite.isPending;
  const isError = addSite.isError || updateSite.isError;

  if (isError) {
    const err = addSite.error || updateSite.error;
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <i className="ri-close-circle-line text-danger fs-1 mb-3" aria-hidden />
        <h5 className="mb-1">Connection failed</h5>
        <p className="text-muted text-center mb-3">{err?.message}</p>
        <Button variant="primary" size="sm" onClick={() => navigate(ROUTE_PATHS.SITES)}>
          Naar sites
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
      {isPending ? (
        <Spinner animation="border" variant="primary" className="mb-3" />
      ) : (
        <i className="ri-checkbox-circle-line text-success fs-1 mb-3" aria-hidden />
      )}
      <h5 className="mb-1">{isPending ? 'Site koppelen…' : 'Site gekoppeld!'}</h5>
      <p className="text-muted mb-0">{isPending ? 'Saving connection…' : 'Redirecting to sites.'}</p>
    </Container>
  );
};

export default ConnectSuccessPage;
