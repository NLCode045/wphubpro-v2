import { parseActionLogForAudit } from '@/domains/sites';
import { getChecksForDashboard, parseSiteHealthMeta, severityTotalsForChecks } from '@/lib/parseSiteHealthMeta';
import type { Site, SiteHealthSeverity } from '@/types';
import SiteActionHistoryList from '@/views/sites/detail/SiteActionHistoryList';
import { SiteHealthAiAgentModal } from '@/views/sites/detail/SiteHealthAiAgentModal';
import SiteHealthMetaPanel from '@/views/sites/detail/SiteHealthMetaPanel';
import { formatChecked, formatSiteHealthCheckedOn } from '@/views/sites/detail/siteDetailFormat';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, Table } from 'react-bootstrap';
import { TbSparkles } from 'react-icons/tb';

export { formatChecked } from '@/views/sites/detail/siteDetailFormat';

type OutgoingLogRow = NonNullable<Site['logData']>['outgoing'][number];

export function SiteDetailHealthPanel({ site }: { site: Site }) {
  const snapshot = useMemo(() => parseSiteHealthMeta(site.healthMeta), [site.healthMeta]);
  const headerChecks = useMemo(() => (snapshot ? getChecksForDashboard(snapshot) : []), [snapshot]);
  const headerTotals = useMemo(() => severityTotalsForChecks(headerChecks), [headerChecks]);
  const criticalCount = headerTotals.critical;
  const warningCount = headerTotals.warning;

  const [severityFilters, setSeverityFilters] = useState<Set<SiteHealthSeverity>>(() => new Set());
  const [healthAiOpen, setHealthAiOpen] = useState(false);
  const [healthAiSession, setHealthAiSession] = useState(0);

  useEffect(() => {
    setSeverityFilters(new Set());
  }, [site.$id, site.healthMeta]);

  const titleFilterActive = (sev: 'critical' | 'warning') =>
    severityFilters.size === 1 && severityFilters.has(sev);

  const onTitleSeverityClick = (sev: 'critical' | 'warning') => {
    setSeverityFilters((prev) => {
      if (prev.size === 1 && prev.has(sev)) return new Set();
      return new Set([sev]);
    });
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start column-gap-3 row-gap-2 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2 min-w-0">
          <h5 className="fs-base mb-0">Health</h5>
          <Button
            type="button"
            variant="outline-primary"
            size="sm"
            className="rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
            style={{ width: 32, height: 32 }}
            title="Health assistant — suggested fixes from Site Health"
            aria-label="Open health assistant"
            onClick={() => {
              setHealthAiSession((n) => n + 1);
              setHealthAiOpen(true);
            }}
          >
            <TbSparkles size={18} aria-hidden />
          </Button>
          {criticalCount > 0 ? (
            <Button
              type="button"
              variant={titleFilterActive('critical') ? 'danger' : 'outline-danger'}
              size="sm"
              className="text-nowrap"
              aria-pressed={titleFilterActive('critical')}
              onClick={() => onTitleSeverityClick('critical')}
            >
              Critical ({criticalCount})
            </Button>
          ) : null}
          {warningCount > 0 ? (
            <Button
              type="button"
              variant={titleFilterActive('warning') ? 'warning' : 'outline-warning'}
              size="sm"
              className="text-nowrap"
              aria-pressed={titleFilterActive('warning')}
              onClick={() => onTitleSeverityClick('warning')}
            >
              Warning ({warningCount})
            </Button>
          ) : null}
        </div>
        <div className="text-end ms-auto">
          <div className="fs-sm mb-1 text-body">
            Site Health Checked on: {formatSiteHealthCheckedOn(site.lastChecked)}
          </div>
          <div className="fs-sm d-flex flex-wrap align-items-center justify-content-end gap-1">
            <span className="text-body">Health Status:</span>
            <span className={`badge badge-soft-${site.healthStatus === 'healthy' ? 'success' : 'warning'}`}>
              {site.healthStatus === 'healthy' ? 'Healthy' : 'Needs attention'}
            </span>
          </div>
        </div>
      </div>
      <SiteHealthMetaPanel site={site} severityFilters={severityFilters} setSeverityFilters={setSeverityFilters} />
      <SiteHealthAiAgentModal
        key={`health-ai-${site.$id}-${healthAiSession}`}
        site={site}
        show={healthAiOpen}
        sessionKey={healthAiSession}
        onHide={() => setHealthAiOpen(false)}
      />
    </div>
  );
}

export function SiteDetailLogsPanel({ site }: { site: Site }) {
  const outgoing = site.logData?.outgoing ?? [];
  const incoming = site.logData?.incoming ?? [];
  const auditLines = useMemo(() => parseActionLogForAudit(site.actionLog), [site.actionLog]);

  return (
    <div className="d-flex flex-column gap-3">
      {outgoing.length > 0 && (
        <Card>
          <CardBody>
            <h5 className="fs-base mb-3">Bridge / proxy (outgoing)</h5>
            <div className="table-responsive border rounded">
              <Table size="sm" className="mb-0 align-middle">
                <thead className="table-light">
                  <tr className="fs-xxs text-uppercase">
                    <th>Time</th>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th className="text-end">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outgoing.map((row: OutgoingLogRow, i: number) => (
                    <tr key={`${row.time}-${i}`}>
                      <td className="text-muted fs-xs text-nowrap">{formatChecked(row.time)}</td>
                      <td className="fs-xs">{row.method}</td>
                      <td className="fs-xs text-break">{row.endpoint}</td>
                      <td className="text-end fs-xs">{row.statusCode}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {incoming.length > 0 && (
        <Card>
          <CardBody>
            <h5 className="fs-base mb-3">Incoming</h5>
            <div className="table-responsive border rounded">
              <Table size="sm" className="mb-0 align-middle">
                <thead className="table-light">
                  <tr className="fs-xxs text-uppercase">
                    <th>Time</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {incoming.map((row, i) => (
                    <tr key={`in-${i}`}>
                      <td className="text-muted fs-xs">{formatChecked((row as { time?: string }).time)}</td>
                      <td className="fs-xs">{(row as { type?: string }).type ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h5 className="fs-base mb-2">Plugin & theme action history</h5>
          <p className="text-muted fs-xs mb-3">
            Same list as the sidebar — date, extension name, type, and what happened (including failed attempts).
          </p>
          <SiteActionHistoryList
            lines={auditLines}
            emptyText="No plugin or theme actions recorded."
            variant="panel-light"
          />
        </CardBody>
      </Card>

      {outgoing.length === 0 &&
      incoming.length === 0 &&
      (!Array.isArray(site.actionLog) || site.actionLog.length === 0) ? (
        <p className="text-muted mb-0">No log entries for this site.</p>
      ) : null}
    </div>
  );
}
