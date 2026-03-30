import { parseActionLogForAudit } from '@/domains/sites';
import type { Site } from '@/types';
import SiteActionHistoryList from '@/views/sites/detail/SiteActionHistoryList';
import SiteHealthMetaPanel from '@/views/sites/detail/SiteHealthMetaPanel';
import { formatChecked } from '@/views/sites/detail/siteDetailFormat';
import { useMemo } from 'react';
import { Card, CardBody, Table } from 'react-bootstrap';

export { formatChecked } from '@/views/sites/detail/siteDetailFormat';

type OutgoingLogRow = NonNullable<Site['logData']>['outgoing'][number];

export function SiteDetailHealthPanel({ site }: { site: Site }) {
  return (
    <div>
      <h5 className="fs-base mb-3">Health</h5>
      <SiteHealthMetaPanel site={site} />
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
