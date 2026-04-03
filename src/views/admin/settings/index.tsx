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
import { useStripePlans } from '@/domains/billing/hooks';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import Select, {
  type CSSObjectWithLabel,
  type GroupBase,
  type SingleValue,
} from 'react-select';
import type { StripePlan, StripePlanAllPrice } from '@/types';
import { useNavigate } from 'react-router';

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

function formatPlanMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function isRecurringStripePrice(p: Pick<StripePlanAllPrice, 'interval'>): boolean {
  return p.interval !== 'one_time';
}

function catalogPriceIdSet(plans: StripePlan[]): Set<string> {
  const s = new Set<string>();
  for (const p of plans) {
    for (const ap of p.allPrices ?? []) {
      if (isRecurringStripePrice(ap)) s.add(ap.id);
    }
    if (p.monthlyPriceId) s.add(p.monthlyPriceId);
    if (p.yearlyPriceId) s.add(p.yearlyPriceId);
  }
  return s;
}

function monthYearFallbackPrices(plan: StripePlan): StripePlanAllPrice[] {
  const out: StripePlanAllPrice[] = [];
  if (plan.monthlyPriceId) {
    out.push({
      id: plan.monthlyPriceId,
      amount: plan.monthlyPrice,
      currency: plan.currency,
      interval: 'month',
      interval_count: 1,
    });
  }
  if (plan.yearlyPriceId) {
    out.push({
      id: plan.yearlyPriceId,
      amount: plan.yearlyPrice,
      currency: plan.currency,
      interval: 'year',
      interval_count: 1,
    });
  }
  return out;
}

/** Recurring prices for the dropdown: prefer `allPrices` from Stripe; else monthly/yearly. */
function recurringPricesForSelect(plan: StripePlan): StripePlanAllPrice[] {
  const fromAll = (plan.allPrices ?? []).filter(isRecurringStripePrice);
  const list = fromAll.length > 0 ? fromAll : monthYearFallbackPrices(plan);
  const byId = new Map<string, StripePlanAllPrice>();
  for (const row of list) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

function formatRecurringIntervalLabel(interval: string, intervalCount: number): string {
  if (interval === 'one_time') return 'One-time';
  const n = intervalCount > 1 ? intervalCount : 1;
  if (interval === 'month') {
    return n === 1 ? 'Monthly' : `Every ${n} months`;
  }
  if (interval === 'year') {
    return n === 1 ? 'Yearly' : `Every ${n} years`;
  }
  if (interval === 'week') {
    return n === 1 ? 'Weekly' : `Every ${n} weeks`;
  }
  if (interval === 'day') {
    return n === 1 ? 'Daily' : `Every ${n} days`;
  }
  return n === 1 ? interval : `Every ${n} ${interval}`;
}

type StripePriceSelectOption = { value: string; label: string };

const signupPlanMenuPortalStyles = {
  menuPortal: (base: CSSObjectWithLabel) => ({ ...base, zIndex: 2000 }),
};

function findStripePriceSelectValue(
  groups: GroupBase<StripePriceSelectOption>[],
  priceId: string,
): StripePriceSelectOption | null {
  for (const g of groups) {
    for (const o of g.options) {
      if (o.value === priceId) return o;
    }
  }
  return null;
}

const AdminPlatformSettingsPage = () => {
  const { isAdmin, user } = useAuth();
  const { setMode } = useDashboardNav();
  const navigate = useNavigate();
  const { showNotification } = useNotificationContext();
  const userId = user?.$id;

  const { data: items = [], isLoading, isError, error, refetch } = usePlatformSettingsList(userId);
  const upsert = usePlatformSettingsUpsert(userId);
  const {
    data: stripePlans = [],
    isLoading: plansLoading,
    isError: plansError,
    error: plansQueryError,
  } = useStripePlans(undefined, { listAllProducts: true });

  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Region, setS3Region] = useState('');
  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');

  const [bridgeVersion, setBridgeVersion] = useState('');
  const [bridgeUploadedAt, setBridgeUploadedAt] = useState('');

  const [stripeDefaultPriceId, setStripeDefaultPriceId] = useState('');

  const [requireEmailOtpOnly, setRequireEmailOtpOnly] = useState(false);

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

    const auth = recordFromValue(map.get('auth'));
    setRequireEmailOtpOnly(Boolean(auth.requireEmailOtpOnly));
  }, [items]);

  const catalogPriceIds = useMemo(() => catalogPriceIdSet(stripePlans), [stripePlans]);
  const orphanSignupPriceId = useMemo(() => {
    const id = stripeDefaultPriceId.trim();
    if (!id || catalogPriceIds.has(id)) return '';
    return id;
  }, [stripeDefaultPriceId, catalogPriceIds]);

  const stripeSignupGroupedOptions = useMemo((): GroupBase<StripePriceSelectOption>[] => {
    const generalOptions: StripePriceSelectOption[] = [
      {
        value: '',
        label: 'None — no automatic subscription for new signups',
      },
    ];
    if (orphanSignupPriceId) {
      generalOptions.push({
        value: orphanSignupPriceId,
        label: `Current (not in catalog): ${orphanSignupPriceId}`,
      });
    }
    const planGroups: GroupBase<StripePriceSelectOption>[] = stripePlans.reduce(
      (acc, plan) => {
        const rows = recurringPricesForSelect(plan);
        if (rows.length === 0) return acc;
        acc.push({
          label: plan.name,
          options: rows.map((row) => ({
            value: row.id,
            label: `${plan.name} · ${formatRecurringIntervalLabel(row.interval, row.interval_count)} · ${formatPlanMoney(row.amount, row.currency)}`,
          })),
        });
        return acc;
      },
      [] as GroupBase<StripePriceSelectOption>[],
    );

    return [{ label: 'Default', options: generalOptions }, ...planGroups];
  }, [stripePlans, orphanSignupPriceId]);

  const stripeSignupSelectValue = useMemo(
    () => findStripePriceSelectValue(stripeSignupGroupedOptions, stripeDefaultPriceId),
    [stripeSignupGroupedOptions, stripeDefaultPriceId],
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

  const saveAuth = async () => {
    try {
      await upsert.mutateAsync({
        category: 'auth',
        settings: {
          requireEmailOtpOnly,
        },
      });
      showNotification({
        title: 'Saved',
        message: 'Authentication settings were updated.',
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
          subtitle="Admin · S3, bridge release metadata, and Stripe signup plan (platform_settings)"
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
                  <Card.Title as="h5">Authentication</Card.Title>
                  <Card.Text className="text-muted small">
                    Email one-time code (Appwrite Email OTP) for sign-in. When enabled, the login and registration pages
                    use email codes only—password and GitHub sign-in are hidden. Stored under platform key{' '}
                    <code>auth</code>.
                  </Card.Text>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="admin-require-email-otp-only"
                      label="Require email code sign-in for all users"
                      checked={requireEmailOtpOnly}
                      onChange={(e) => setRequireEmailOtpOnly(e.target.checked)}
                      disabled={upsert.isPending}
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={upsert.isPending}
                    onClick={() => void saveAuth()}>
                    {upsert.isPending ? 'Saving…' : 'Save authentication'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border h-100">
                <Card.Body>
                  <Card.Title as="h5">Stripe signup plan</Card.Title>
                  <Card.Text className="text-muted small">
                    New accounts get this Stripe price as their initial subscription when set here.
                    Stored as <code>stripe_signup_plan.defaultSignupPlanPriceId</code> in platform
                    settings.
                  </Card.Text>
                  {plansError && (
                    <Alert variant="warning" className="small py-2 mb-3">
                      Could not load Stripe plans:{' '}
                      {plansQueryError instanceof Error ? plansQueryError.message : 'Unknown error'}
                    </Alert>
                  )}
                  <Form.Group className="mb-3">
                    <Form.Label htmlFor="admin-stripe-signup-price-select">Default plan for new signups</Form.Label>
                    {plansLoading ? (
                      <div className="d-flex align-items-center gap-2 text-muted small py-2">
                        <Spinner animation="border" size="sm" />
                        Loading plans…
                      </div>
                    ) : (
                      <Select<StripePriceSelectOption, false, GroupBase<StripePriceSelectOption>>
                        inputId="admin-stripe-signup-price-select"
                        className="react-select"
                        classNamePrefix="react-select"
                        aria-label="Default Stripe price for new signups"
                        placeholder="Select a plan…"
                        options={stripeSignupGroupedOptions}
                        value={stripeSignupSelectValue}
                        onChange={(opt: SingleValue<StripePriceSelectOption>) => {
                          setStripeDefaultPriceId(opt?.value ?? '');
                        }}
                        isDisabled={upsert.isPending}
                        isSearchable
                        isClearable={false}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        styles={signupPlanMenuPortalStyles}
                      />
                    )}
                  </Form.Group>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={upsert.isPending || plansLoading}
                    onClick={() => void saveStripe()}>
                    {upsert.isPending ? 'Saving…' : 'Save signup plan'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
};

export default AdminPlatformSettingsPage;
