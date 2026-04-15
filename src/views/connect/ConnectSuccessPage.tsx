/**
 * WordPress bridge OAuth / connect callback: completes the site row and syncs credentials back to WordPress.
 *
 * Query params (new flow): `site_url`, `user_login`, `connect_token` (exchanged for bridge_secret on the site).
 * Legacy: `site_url`, `user_login`, `api_key` (bridge secret already known).
 */
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth } from '@/domains/auth'
import { useAddSite, useSites, useUpdateSite } from '@/domains/sites'
import { APPWRITE_ENDPOINT, APPWRITE_HEARTBEAT_URL, APPWRITE_PROJECT_ID } from '@/services/appwrite'
import { useEffect, useRef, useState } from 'react'
import { Button, Container, Spinner } from 'react-bootstrap'
import { TbAlertTriangle, TbCircleCheck, TbLogout } from 'react-icons/tb'
import { useNavigate, useSearchParams } from 'react-router'

async function exchangeToken(siteUrl: string, connectToken: string): Promise<string> {
  const base = siteUrl.replace(/\/$/, '')
  const url = `${base}/wp-json/wphubpro/v1/exchange-token?connect_token=${encodeURIComponent(connectToken)}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string })?.message || `Token exchange failed: ${res.status}`)
  }
  const data = (await res.json()) as { bridge_secret?: string }
  if (!data?.bridge_secret) throw new Error('No bridge_secret in response')
  return data.bridge_secret
}

/** Push Hub connection metadata back to WordPress so the bridge can send heartbeats, etc. */
async function saveConnectionToWordPress(
  siteUrl: string,
  bridgeSecret: string,
  siteId: string,
  siteSecret?: string,
  encryptedApiKey?: string,
  wpAdminUsername?: string,
): Promise<void> {
  const base = siteUrl.replace(/\/$/, '')
  const url = `${base}/wp-json/wphubpro/v1/save-connection`
  try {
    const body: Record<string, unknown> = {
      bridge_secret: bridgeSecret,
      endpoint: APPWRITE_ENDPOINT,
      project_id: APPWRITE_PROJECT_ID,
      site_id: siteId,
      heartbeat_url: APPWRITE_HEARTBEAT_URL || undefined,
    }
    if (siteSecret) body.site_secret = siteSecret
    if (encryptedApiKey) body.encrypted_api_key = encryptedApiKey
    if (wpAdminUsername?.trim()) body.username = wpAdminUsername.trim()
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WPHub-Key': bridgeSecret,
      },
      body: JSON.stringify(body),
    })
  } catch {
    /* Non-fatal: hub ↔ Appwrite connection still works */
  }
}

const normalizeUrl = (url: string) => {
  const s = (url || '').trim()
  if (!s) return ''
  try {
    return s.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
  } catch {
    return s
  }
}

export default function ConnectSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: sites, isLoading: sitesLoading } = useSites()
  const addSite = useAddSite()
  const updateSite = useUpdateSite()
  const processed = useRef(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const siteUrl = searchParams.get('site_url') || ''
  const userLogin = searchParams.get('user_login') || ''
  const connectToken = searchParams.get('connect_token') || ''
  const apiKeyLegacy = searchParams.get('api_key') || ''

  const isNewFlow = Boolean(connectToken)

  useEffect(() => {
    if (processed.current || sitesLoading || !user) return
    if (!siteUrl || (!connectToken && !apiKeyLegacy)) {
      processed.current = true
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
      return
    }
    const sitesList = Array.isArray(sites) ? sites : []
    const normalized = normalizeUrl(siteUrl)
    if (!normalized) {
      processed.current = true
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
      return
    }
    const existing = sitesList.find((s) => {
      const existingNorm = normalizeUrl(s.siteUrl || '')
      return existingNorm && existingNorm === normalized
    })
    const fullSiteUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
    const goSites = () => navigate(ROUTE_PATHS.SITES, { replace: true })

    const runWithBridgeSecret = (bridgeSecret: string) => {
      processed.current = true
      const siteName = (() => {
        try {
          return new URL(fullSiteUrl).hostname || siteUrl
        } catch {
          return siteUrl
        }
      })()

      if (existing) {
        updateSite.mutate(
          { siteId: existing.$id, apiKey: bridgeSecret },
          {
            onSuccess: (data) => {
              const siteSecret = data.siteSecret ?? data.site_secret
              const encryptedKey = data.encrypted_api_key
              void saveConnectionToWordPress(
                fullSiteUrl,
                bridgeSecret,
                existing.$id,
                siteSecret,
                encryptedKey,
              ).then(goSites)
            },
            onError: () => {},
          },
        )
      } else {
        addSite.mutate(
          {
            siteUrl: siteUrl.replace(/\/$/, ''),
            siteName,
            username: userLogin || undefined,
            apiKey: bridgeSecret,
          },
          {
            onSuccess: (data) => {
              const newSiteId = data?.$id
              const siteSecret = data.siteSecret ?? data.site_secret
              const encryptedKey = data.encrypted_api_key
              if (newSiteId) {
                void saveConnectionToWordPress(
                  fullSiteUrl,
                  bridgeSecret,
                  newSiteId,
                  siteSecret,
                  encryptedKey,
                  userLogin || undefined,
                ).then(goSites)
              } else {
                goSites()
              }
            },
            onError: () => {},
          },
        )
      }
    }

    if (isNewFlow) {
      void exchangeToken(fullSiteUrl, connectToken)
        .then(runWithBridgeSecret)
        .catch((err: Error) => {
          processed.current = true
          setTokenError(err?.message || 'Token exchange failed')
        })
    } else {
      runWithBridgeSecret(apiKeyLegacy)
    }
  }, [
    user,
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
  ])

  if (sitesLoading || !user) {
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" role="status" variant="primary" className="mb-3" />
        <p className="text-muted small mb-0">Loading your sites…</p>
      </Container>
    )
  }

  if (!siteUrl || (!connectToken && !apiKeyLegacy)) {
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <TbAlertTriangle className="text-warning mb-3" size={48} aria-hidden />
        <p className="fw-medium mb-1">Invalid callback</p>
        <p className="text-muted small mb-3 text-center">Missing site_url or connect_token / api_key.</p>
        <Button variant="primary" size="sm" onClick={() => navigate(ROUTE_PATHS.DASHBOARD)}>
          Back to dashboard
        </Button>
      </Container>
    )
  }

  if (tokenError) {
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <TbLogout className="text-danger mb-3" size={48} aria-hidden />
        <p className="fw-medium mb-1">Token exchange failed</p>
        <p className="text-muted small mb-3 text-center">{tokenError}</p>
        <Button variant="primary" size="sm" onClick={() => navigate(ROUTE_PATHS.DASHBOARD)}>
          Back to dashboard
        </Button>
      </Container>
    )
  }

  const isPending = addSite.isPending || updateSite.isPending
  const isError = addSite.isError || updateSite.isError

  if (isError) {
    const err = addSite.error || updateSite.error
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <TbLogout className="text-danger mb-3" size={48} aria-hidden />
        <p className="fw-medium mb-1">Connection failed</p>
        <p className="text-muted small mb-3 text-center">{err?.message}</p>
        <Button variant="primary" size="sm" onClick={() => navigate(ROUTE_PATHS.SITES)}>
          View sites
        </Button>
      </Container>
    )
  }

  return (
    <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
      {isPending ? (
        <Spinner animation="border" role="status" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
      ) : (
        <TbCircleCheck className="text-success mb-3" size={48} aria-hidden />
      )}
      <p className="fw-medium mb-1">{isPending ? 'Linking site…' : 'Site linked'}</p>
      <p className="text-muted small">{isPending ? 'Saving connection…' : 'Redirecting to Sites.'}</p>
    </Container>
  )
}
