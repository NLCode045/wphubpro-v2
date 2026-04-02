import PageBreadcrumb from '@/components/PageBreadcrumb.tsx';
import PageMetaData from '@/components/PageMetaData';
import { ROUTE_PATHS } from '@/config/routePaths';
import { useDashboardNav } from '@/context/DashboardNavContext';
import { useNotificationContext } from '@/context/useNotificationContext';
import { useAuth } from '@/domains/auth';
import {
  usePlatformSettingsList,
  usePlatformSettingsUpsert,
  type PlatformSettingItem,
} from '@/domains/admin/usePlatformSettings';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router';

const KNOWN_KEYS = new Set(['s3', 'bridge_plugin', 'stripe_signup_plan']);

function recordFromValue(v: unknown): Record<string, string> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(o)) {
      if (k.startsWith('_')) continue;
      out[k] = val == null ? '' : String(val);
    }
    return out;
  }
  return {};
}

const AdminPlatformSettingsPage = () => {
  const { isAdmin, user } = useAuth();
  const { setMode } = useDashboardNav();
  const navigate = useNavigate();
  const { showNotification } = useNotificationContext();
  const userId = user?.$id;

  const { data: items = [], isLoading, isError, error, refetch } = usePlatformSettingsList(userId);
  const upsert = usePlatformSettingsUpsert(userId);

  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Region, setS3Region] = useState('');
  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');

  const [bridgeVersion, setBridgeVersion] = useState('');
  const [bridgeUploadedAt, setBridgeUploadedAt] = useState('');

  const [stripeDefaultPriceId, setStripeDefaultPriceId] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
      return;
    }
    setMode('admin');
  }, [isAdmin, navigate, setMode]);

  useEffect(() => {
    if (!items.length) return;
    const map = new Map(items.map((i: PlatformSettingItem) => [i.key, i.value]));
    const s3 = recordFromValue(map.get('s3'));
    setS3Bucket(s3.bucket ?? '');
    setS3Region(s3.region ?? '');
    setS3AccessKey(s3.accessKey ?? '');
    setS3SecretKey(s3.secretKey ?? '');

    const bridge = recordFromValue(map.get('bridge_plugin'));
    setBridgeVersion(bridge.version ?? '');
    setBridgeUploadedAt(bridge.uploaded_at ?? '');

    const stripe = recordFromValue(map.get('stripe_signup_plan'));
    setStripeDefaultPriceId(stripe.defaultSignupPlanPriceId ?? '');
  }, [items]);

  const otherSettings = useMemo(
    () => items.filter((i) => !KNOWN_KEYS.has(i.key)),
    [items],
  );

  const notifyError = (err: unknown) => {
    showNotification({
      title: 'Error',
      message: err instanceof Error ? err.message : 'Something went wrong',
      variant: 'danger',
    });
  };

  const saveS3 = async () => {
    try {
      await upsert.mutateAsync({
        category: 's3',
        settings: {
          bucket: s3Bucket.trim(),
          region: s3Region.trim(),
          accessKey: s3AccessKey.trim(),
          secretKey: s3SecretKey.trim(),
        },
      });
      showNotification({
        title: 'Saved',
        message: 'S3 settings were updated.',
        variant: 'success',
      });
    } catch (err) {
      notifyError(err);
    }
  };

  const saveBridge = async () => {
    try {
      await upsert.mutateAsync({
        category: 'bridge_plugin',
        settings: {
          version: bridgeVersion.trim(),
          uploaded_at: bridgeUploadedAt.trim(),
        },
      });
      showNotification({
        title: 'Saved',
        message: 'Bridge plugin metadata was updated.',
        variant: 'success',
      });
    } catch (err) {
      notifyError(err);
    }
  };

  const saveStripe = async () => {
    try {
      await upsert.mutateAsync({
        category: 'stripe_signup_plan',
        settings: {
          defaultSignupPlanPriceId: stripeDefaultPriceId.trim(),
        },
      });
      showNotification({
        title: 'Saved',
        message: 'Stripe signup plan settings were updated.',
        variant: 'success',
      });
    } catch (err) {
      notifyError(err);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <PageMetaData title="Platform settings · Admin" />
      <Container fluid>
        <PageBreadcrumb
          title="Platform settings"
          subtitle="Admin · keys stored in platform_settings (used by functions and bridge)"
        />

        {isLoading && (
          <div className="d-flex align-items-center gap-2 text-muted py-4">
            <Spinner animation="border" size="sm" role="status" />
            Loading settings…
          </div>
        )}

        {isError && !isLoading && (
          <Card className="border border-danger">
            <Card.Body>
              <Card.Title as="h5" className="text-danger">
                Could not load settings
              </Card.Title>
              <Card.Text className="mb-3">
                {error instanceof Error ? error.message : 'Unknown error'}
              </Card.Text>
              <Button variant="outline-primary" type="button" onClick={() => refetch()}>
                Retry
              </Button>
            </Card.Body>
          </Card>
        )}

        {!isLoading && !isError && (
          <Row className="g-3">
            <Col lg={6}>
              <Card className="border h-100">
                <Card.Body>
                  <Card.Title as="h5">S3 (library / zip-parser)</Card.Title>
                  <Card.Text className="text-muted small">
                    Fallback credentials when S3 env vars are not set on the function. Stored as JSON
                    under key <code>s3</code>.
                  </Card.Text>
                  <Form.Group className="mb-2">
                    <Form.Label>Bucket</Form.Label>
                    <Form.Control
                      value={s3Bucket}
                      onChange={(e) => setS3Bucket(e.target.value)}
                      autoComplete="off"
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Region</Form.Label>
                    <Form.Control
                      value={s3Region}
                      onChange={(e) => setS3Region(e.target.value)}
                      autoComplete="off"
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Access key ID</Form.Label>
                    <Form.Control
                      type="password"
                      value={s3AccessKey}
                      onChange={(e) => setS3AccessKey(e.target.value)}
                      autoComplete="off"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Secret access key</Form.Label>
                    <Form.Control
                      type="password"
                      value={s3SecretKey}
                      onChange={(e) => setS3SecretKey(e.target.value)}
                      autoComplete="off"
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={upsert.isPending}
                    onClick={() => void saveS3()}>
                    {upsert.isPending ? 'Saving…' : 'Save S3'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border h-100">
                <Card.Body>
                  <Card.Title as="h5">Bridge plugin</Card.Title>
                  <Card.Text className="text-muted small">
                    Latest bridge version sent to sites via <code>wp-proxy</code> (
                    <code>bridge_plugin</code>). Releases normally update this automatically.
                  </Card.Text>
                  <Form.Group className="mb-2">
                    <Form.Label>Version (semver)</Form.Label>
                    <Form.Control
                      value={bridgeVersion}
                      onChange={(e) => setBridgeVersion(e.target.value)}
                      placeholder="1.0.0"
                      autoComplete="off"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Uploaded at</Form.Label>
                    <Form.Control
                      value={bridgeUploadedAt}
                      onChange={(e) => setBridgeUploadedAt(e.target.value)}
                      placeholder="YYYY-MM-DD HH:mm:ss"
                      autoComplete="off"
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={upsert.isPending}
                    onClick={() => void saveBridge()}>
                    {upsert.isPending ? 'Saving…' : 'Save bridge'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border h-100">
                <Card.Body>
                  <Card.Title as="h5">Stripe signup plan</Card.Title>
                  <Card.Text className="text-muted small">
                    Default price ID for new customers when <code>STRIPE_FREE_TIER_PRICE_ID</code> is
                    not set (<code>stripe_signup_plan</code>).
                  </Card.Text>
                  <Form.Group className="mb-3">
                    <Form.Label>defaultSignupPlanPriceId</Form.Label>
                    <Form.Control
                      value={stripeDefaultPriceId}
                      onChange={(e) => setStripeDefaultPriceId(e.target.value)}
                      placeholder="price_…"
                      autoComplete="off"
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={upsert.isPending}
                    onClick={() => void saveStripe()}>
                    {upsert.isPending ? 'Saving…' : 'Save Stripe'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {otherSettings.length > 0 && (
              <Col lg={12}>
                <Card className="border">
                  <Card.Body>
                    <Card.Title as="h5">Other keys</Card.Title>
                    <Card.Text className="text-muted small mb-3">
                      Additional documents in <code>platform_settings</code> (read-only here).
                    </Card.Text>
                    {otherSettings.map((row) => (
                      <div key={row.key} className="mb-3">
                        <div className="fw-semibold mb-1">{row.key}</div>
                        <pre className="small bg-light p-2 rounded mb-0 overflow-auto">
                          {JSON.stringify(row.value, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Container>
    </>
  );
};

export default AdminPlatformSettingsPage;
