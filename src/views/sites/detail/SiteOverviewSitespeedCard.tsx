import { TabNavLabel } from '@/components/TabNavLabel';
import { useAuth } from '@/domains/auth';
import {
  fetchSitePagespeedResult,
  removeSitePagespeedFromSession,
  setPagespeedInSession,
  sitePagespeedQueryKey,
  useSitePagespeedStrategy,
  type SitePagespeedStrategy,
} from '@/domains/sites';
import type { SitePagespeedCoreWebVitals, SitePagespeedResult, SitePagespeedScores } from '@/types';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, CardBody, Col, Nav, Row, Spinner, Tab } from 'react-bootstrap';
import { TbDeviceDesktop, TbDeviceMobile, TbExternalLink, TbRefresh } from 'react-icons/tb';

function computeCombinedAverage(scores: SitePagespeedScores | undefined): number | null {
  if (!scores) return null;
  const parts = [scores.performance, scores.accessibility, scores.bestPractices, scores.seo];
  const nums = parts.filter((x): x is number => typeof x === 'number' && !Number.isNaN(x));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** A = 90–100 (perfect range), … F = &lt;60. */
function letterGradeFromAverage(avg: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (avg >= 90) return 'A';
  if (avg >= 80) return 'B';
  if (avg >= 70) return 'C';
  if (avg >= 60) return 'D';
  return 'F';
}

function gradeDisplayClass(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string {
  switch (grade) {
    case 'A':
      return 'text-success';
    case 'B':
      return 'text-info';
    case 'C':
      return 'text-warning';
    case 'D':
      return 'text-warning';
    case 'F':
      return 'text-danger';
  }
}

function conicGradientForScore(combined: number): string {
  const sweep = Math.min(360, Math.max(0, (combined / 100) * 360));
  const mid = sweep * 0.5;
  return `conic-gradient(from -90deg, #dc2626 0deg, #f59e0b ${mid}deg, #16a34a ${sweep}deg, var(--bs-border-color, #dee2e6) ${sweep}deg 360deg)`;
}

type GradientDonutProps = {
  combined: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
};

function PagespeedGradientDonut({ combined, grade }: GradientDonutProps) {
  const label = `PageSpeed grade ${grade} (average category score ${combined} out of 100)`;
  return (
    <div
      className="position-relative flex-shrink-0 mx-auto"
      style={{ width: 128, height: 128 }}
      role="img"
      aria-label={label}
    >
      <div className="rounded-circle w-100 h-100 shadow-sm" style={{ background: conicGradientForScore(combined) }} />
      <div
        className="position-absolute top-50 start-50 translate-middle rounded-circle bg-body border d-flex flex-column align-items-center justify-content-center"
        style={{ width: '72%', height: '72%', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}
      >
        <span className={`display-5 fw-bold lh-1 ${gradeDisplayClass(grade)}`} style={{ letterSpacing: '-0.05em' }}>
          {grade}
        </span>
      </div>
    </div>
  );
}

function scoreTextClass(n: number | null): string {
  if (n == null) return 'text-muted';
  if (n >= 90) return 'text-success';
  if (n >= 50) return 'text-warning';
  return 'text-danger';
}

/** 0 = poor, 100 = good — aligns roughly with web.dev TTFB (good ≤800ms, poor ≥1800ms). */
function goodnessTtfb(ms: number): number {
  if (ms <= 800) return 100;
  if (ms >= 1800) return 0;
  return Math.round(100 - ((ms - 800) / 1000) * 100);
}

function goodnessLcp(ms: number): number {
  if (ms <= 2500) return 100;
  if (ms >= 4000) return 0;
  return Math.round(100 - ((ms - 2500) / 1500) * 100);
}

function goodnessCls(cls: number): number {
  if (cls <= 0.1) return 100;
  if (cls >= 0.25) return 0;
  return Math.round(100 - ((cls - 0.1) / 0.15) * 100);
}

type VitalsRating = 'good' | 'needs' | 'poor';

function ratingFromGoodness(g: number): VitalsRating {
  if (g >= 80) return 'good';
  if (g >= 45) return 'needs';
  return 'poor';
}

function formatTtfb(ms: number): string {
  return `${Math.round(ms)} ms`;
}

function formatLcp(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)} s`;
  return `${Math.round(ms)} ms`;
}

function formatCls(cls: number): string {
  return cls.toFixed(3);
}

/** Conic ring fill 0–100 (same red → amber → green language as the grade donut). */
function conicGoodnessBackground(goodness: number): string {
  const g = Math.min(100, Math.max(0, goodness));
  const sweep = (g / 100) * 360;
  const mid = sweep * 0.5;
  return `conic-gradient(from -90deg, #dc2626 0deg, #f59e0b ${mid}deg, #16a34a ${sweep}deg, var(--bs-border-color, #dee2e6) ${sweep}deg 360deg)`;
}

function MiniVitalGradientRing({ goodness, ariaLabel }: { goodness: number; ariaLabel: string }) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="d-flex align-items-center justify-content-center rounded-circle mx-auto shadow-sm flex-shrink-0"
      style={{
        width: 56,
        height: 56,
        background: conicGoodnessBackground(goodness),
      }}
    >
      <div
        className="rounded-circle bg-body border"
        style={{
          width: '62%',
          height: '62%',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
        }}
      />
    </div>
  );
}

function ratingBadgeClass(r: VitalsRating): string {
  if (r === 'good') return 'badge-soft-success';
  if (r === 'needs') return 'badge-soft-warning';
  return 'badge-soft-danger';
}

function ratingLabel(r: VitalsRating): string {
  if (r === 'good') return 'Good';
  if (r === 'needs') return 'Needs improvement';
  return 'Poor';
}

function VitalColumn({
  title,
  shortTitle,
  valueDisplay,
  goodness,
}: {
  title: string;
  shortTitle: string;
  valueDisplay: string;
  goodness: number | null;
}) {
  const has = goodness != null;
  const g = has ? goodness! : 0;
  const rating = has ? ratingFromGoodness(g) : 'poor';
  const ringLabel = has
    ? `${shortTitle}: ${valueDisplay}; relative score ${g} out of 100 (${ratingLabel(rating)})`
    : `${shortTitle}: no data`;
  return (
    <Col xs={4} className="d-flex flex-column align-items-center px-1">
      <p className="text-muted fs-xxs text-uppercase fw-semibold mb-2 text-center w-100 text-truncate" title={title}>
        {shortTitle}
      </p>
      {has ? (
        <MiniVitalGradientRing goodness={g} ariaLabel={ringLabel} />
      ) : (
        <div
          className="mx-auto rounded-circle bg-light border d-flex align-items-center justify-content-center flex-shrink-0 text-muted fs-xxs"
          style={{ width: 56, height: 56 }}
          aria-hidden
        >
          —
        </div>
      )}
      <p className="fs-6 fw-bold tabular-nums mb-1 mt-2 lh-sm text-body text-center text-break w-100">{has ? valueDisplay : '—'}</p>
      <span className={`badge ${has ? ratingBadgeClass(rating) : 'badge-soft-secondary'} fs-xxs text-truncate`} style={{ maxWidth: '100%' }}>
        {has ? ratingLabel(rating) : 'No data'}
      </span>
    </Col>
  );
}

function CoreWebVitalsColumns({ vitals }: { vitals?: SitePagespeedCoreWebVitals }) {
  const ttfb = vitals?.timeToFirstByteMs ?? null;
  const lcp = vitals?.largestContentfulPaintMs ?? null;
  const cls = vitals?.cumulativeLayoutShift ?? null;

  const gTtfb = ttfb != null && !Number.isNaN(ttfb) ? goodnessTtfb(ttfb) : null;
  const gLcp = lcp != null && !Number.isNaN(lcp) ? goodnessLcp(lcp) : null;
  const gCls = cls != null && !Number.isNaN(cls) ? goodnessCls(cls) : null;

  return (
    <div className="mt-4 pt-3 border-top border-light">
      <p className="text-muted fs-xxs text-uppercase fw-semibold mb-3">Time to first byte · Largest Contentful Paint · Cumulative Layout Shift</p>
      <Row className="g-0 gx-1 align-items-start justify-content-between">
        <VitalColumn
          title="Time to first byte (Lighthouse server-response-time audit)"
          shortTitle="TTFB"
          valueDisplay={ttfb != null ? formatTtfb(ttfb) : '—'}
          goodness={gTtfb}
        />
        <VitalColumn
          title="Largest Contentful Paint"
          shortTitle="LCP"
          valueDisplay={lcp != null ? formatLcp(lcp) : '—'}
          goodness={gLcp}
        />
        <VitalColumn
          title="Cumulative Layout Shift"
          shortTitle="CLS"
          valueDisplay={cls != null ? formatCls(cls) : '—'}
          goodness={gCls}
        />
      </Row>
    </div>
  );
}

function CategoryBreakdown({ scores }: { scores: SitePagespeedScores }) {
  const rows: { label: string; value: number | null | undefined }[] = [
    { label: 'Performance', value: scores.performance },
    { label: 'Accessibility', value: scores.accessibility },
    { label: 'Best practices', value: scores.bestPractices },
    { label: 'SEO', value: scores.seo },
  ];
  return (
    <ul className="list-unstyled mb-0 small w-100">
      {rows.map(({ label, value }) => {
        const n = value == null || Number.isNaN(value) ? null : Math.min(100, Math.max(0, value));
        return (
          <li key={label} className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
            <span className="text-muted fs-xs">{label}</span>
            <span className={`fs-xs fw-semibold tabular-nums ${scoreTextClass(n)}`}>{n == null ? '—' : `${n}`}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PagespeedVisualBlock({
  scores,
  coreWebVitals,
}: {
  scores: SitePagespeedScores;
  coreWebVitals?: SitePagespeedCoreWebVitals;
}) {
  const combined = computeCombinedAverage(scores);
  if (combined == null) {
    return <p className="text-muted fs-xs mb-0">No category scores in response.</p>;
  }
  const grade = letterGradeFromAverage(combined);
  return (
    <div>
      <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-3 gap-sm-4">
        <PagespeedGradientDonut combined={combined} grade={grade} />
        <div className="flex-grow-1 min-w-0">
          <p className="text-muted fs-xxs text-uppercase fw-semibold mb-2">Category scores</p>
          <CategoryBreakdown scores={scores} />
          <p className="text-muted fs-xxs mb-0 mt-2">Grade is based on the averange category scores with Equal Weight.</p>
        </div>
      </div>
      <CoreWebVitalsColumns vitals={coreWebVitals} />
    </div>
  );
}

function StrategyTabBody({
  strategy,
  isActive,
  siteUrl,
  q,
}: {
  strategy: SitePagespeedStrategy;
  isActive: boolean;
  siteUrl: string;
  q: UseQueryResult<SitePagespeedResult, Error>;
}) {
  const scoresCached = q.data?.scores;
  if (!isActive) {
    if (scoresCached) {
      const analyzedUrl = q.data?.analyzedUrl || siteUrl;
      return (
        <>
          <p className="text-muted fs-xxs mb-2">Showing results stored for this browser session.</p>
          <PagespeedVisualBlock scores={scoresCached} coreWebVitals={q.data?.coreWebVitals} />
          {analyzedUrl.startsWith('http') ? (
            <a
              href={pagespeedWebHref(analyzedUrl, strategy)}
              target="_blank"
              rel="noopener noreferrer"
              className="fs-xs link-reset d-inline-flex align-items-center gap-1 mt-3"
            >
              <TbExternalLink /> Open {strategy} report on PageSpeed web
            </a>
          ) : null}
        </>
      );
    }
    return (
      <p className="text-muted fs-xs mb-0">
        Session prefetch will fill this tab, or open it to run a new <strong>{strategy}</strong> analysis.
      </p>
    );
  }
  if (q.isLoading) {
    return (
      <div className="d-flex align-items-center gap-2 py-3 text-muted fs-xs">
        <Spinner animation="border" size="sm" />
        <span>Running Lighthouse ({strategy})… This can take a few minutes.</span>
      </div>
    );
  }
  if (q.isError) {
    return <p className="text-danger fs-xs mb-0">{q.error.message}</p>;
  }
  const scores = q.data?.scores;
  if (!scores) {
    return <p className="text-danger fs-xs mb-0">No scores in response.</p>;
  }
  const analyzedUrl = q.data?.analyzedUrl || siteUrl;
  return (
    <>
      <PagespeedVisualBlock scores={scores} coreWebVitals={q.data?.coreWebVitals} />
      {analyzedUrl.startsWith('http') ? (
        <a
          href={pagespeedWebHref(analyzedUrl, strategy)}
          target="_blank"
          rel="noopener noreferrer"
          className="fs-xs link-reset d-inline-flex align-items-center gap-1 mt-3"
        >
          <TbExternalLink /> Open {strategy} report on PageSpeed web
        </a>
      ) : null}
    </>
  );
}

function pagespeedWebHref(analyzedUrl: string, formFactor: 'desktop' | 'mobile'): string {
  if (!analyzedUrl.startsWith('http')) return 'https://pagespeed.web.dev/';
  const u = new URL('https://pagespeed.web.dev/analysis');
  u.searchParams.set('url', analyzedUrl);
  if (formFactor === 'mobile') u.searchParams.set('form_factor', 'mobile');
  return u.toString();
}

type SiteOverviewSitespeedCardProps = {
  siteId: string;
  siteUrl: string;
  /** Persisted PageSpeed snapshot from `sites.performance_meta` (optional). */
  performanceMeta?: string;
};

/** Shown on site Overview only; runs PageSpeed when the site has a URL. */
const SiteOverviewSitespeedCard = ({ siteId, siteUrl, performanceMeta }: SiteOverviewSitespeedCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const urlOk = Boolean(siteUrl?.trim());
  const [activeKey, setActiveKey] = useState<SitePagespeedStrategy>('desktop');

  const qDesktop = useSitePagespeedStrategy(
    siteId,
    'desktop',
    urlOk && activeKey === 'desktop',
    performanceMeta,
  );
  const qMobile = useSitePagespeedStrategy(
    siteId,
    'mobile',
    urlOk && activeKey === 'mobile',
    performanceMeta,
  );
  const activeQ = activeKey === 'desktop' ? qDesktop : qMobile;
  const anyFetching = qDesktop.isFetching || qMobile.isFetching;

  const refreshPagespeedSession = () => {
    if (!user?.$id) return;
    removeSitePagespeedFromSession(user.$id, siteId);
    void queryClient.removeQueries({ queryKey: ['site-pagespeed', siteId] });
    const strategies: SitePagespeedStrategy[] = ['desktop', 'mobile'];
    void Promise.all(
      strategies.map((st) =>
        queryClient.fetchQuery({
          queryKey: sitePagespeedQueryKey(siteId, st),
          queryFn: async () => {
            const r = await fetchSitePagespeedResult(siteId, st);
            setPagespeedInSession(user.$id, siteId, st, r);
            return r;
          },
          staleTime: Infinity,
        }),
      ),
    )
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['site', siteId] });
        void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      })
      .catch(() => {});
  };

  return (
    <Card className="flex-fill w-100 min-h-0 border shadow-none d-flex flex-column">
      <CardBody className="d-flex flex-column flex-grow-1 min-h-0">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <div>
            <p className="text-muted fs-xs text-uppercase fw-semibold mb-0">Site Performance</p>
            <p className="text-muted fs-xxs mb-0">
              How is your site performing on the web on topics like speed, accessibility, and SEO?
            </p>
          </div>
          {urlOk && (
            <Button
              type="button"
              variant="light"
              size="sm"
              className="btn-icon border-0 text-muted"
              disabled={anyFetching}
              onClick={() => refreshPagespeedSession()}
              aria-label="Refresh PageSpeed for this site (desktop and mobile)"
              title="Clears session cache and re-runs PageSpeed for desktop and mobile"
            >
              {anyFetching ? <Spinner animation="border" size="sm" /> : <TbRefresh className="fs-lg" />}
            </Button>
          )}
        </div>

        {!urlOk ? (
          <p className="text-muted fs-xs mb-0">Add a site URL to run PageSpeed analysis.</p>
        ) : (
          <div className={`flex-grow-1 ${anyFetching ? 'opacity-50' : ''}`}>
            <Card className="border-0 shadow-none mb-0 bg-transparent">
              <CardBody className="p-0">
                <Tab.Container
                  activeKey={activeKey}
                  onSelect={(k) => {
                    if (k === 'desktop' || k === 'mobile') setActiveKey(k);
                  }}
                  id={`site-pagespeed-tabs-${siteId}`}
                >
                  <div className="px-0 pt-1 border-bottom border-light">
                    <Nav variant="underline" className="fs-xs gap-3 flex-nowrap" role="tablist">
                      <Nav.Item>
                        <Nav.Link eventKey="desktop" className="py-2 px-0">
                          <TabNavLabel Icon={TbDeviceDesktop}>Desktop</TabNavLabel>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="mobile" className="py-2 px-0">
                          <TabNavLabel Icon={TbDeviceMobile}>Mobile</TabNavLabel>
                        </Nav.Link>
                      </Nav.Item>
                    </Nav>
                  </div>
                  <Tab.Content>
                    <Tab.Pane eventKey="desktop" className="p-3">
                      <StrategyTabBody strategy="desktop" isActive={activeKey === 'desktop'} siteUrl={siteUrl} q={qDesktop} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="mobile" className="p-3">
                      <StrategyTabBody strategy="mobile" isActive={activeKey === 'mobile'} siteUrl={siteUrl} q={qMobile} />
                    </Tab.Pane>
                  </Tab.Content>
                </Tab.Container>
              </CardBody>
            </Card>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default SiteOverviewSitespeedCard;
