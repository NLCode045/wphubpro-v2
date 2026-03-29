import { ROUTE_PATHS } from '@/config/routePaths';
import { hasUpdate } from '@/domains/sites/installedMeta';
import type { WordPressPlugin, WordPressTheme } from '@/types';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router';

type InstalledRow =
  | { kind: 'plugin'; item: WordPressPlugin }
  | { kind: 'theme'; item: WordPressTheme };

type SiteInstalledExtensionGridProps = {
  siteId?: string;
  rows: InstalledRow[];
  emptyMessage: string;
};

const SiteInstalledExtensionGrid = ({ siteId, rows, emptyMessage }: SiteInstalledExtensionGridProps) => {
  if (rows.length === 0) {
    return <p className="text-muted text-center py-5 mb-0">{emptyMessage}</p>;
  }

  return (
    <Row className="g-3">
      {rows.map((r) => {
        const isPlugin = r.kind === 'plugin';
        const name = r.item.name;
        const version = r.item.version;
        const author = isPlugin ? r.item.author : undefined;
        const updateAvail = hasUpdate(r.item);
        const active = r.item.status === 'active';

        const key = isPlugin ? `p-${r.item.plugin}` : `t-${r.item.stylesheet}`;
        const detailTo =
          siteId && isPlugin
            ? ROUTE_PATHS.sitePluginDetailPath(siteId, r.item.plugin)
            : siteId && !isPlugin
              ? ROUTE_PATHS.siteThemeDetailPath(siteId, r.item.stylesheet)
              : null;

        return (
          <Col key={key} xs={12} sm={6} xl={4}>
            <Card className="h-100 shadow-sm">
              <CardBody>
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <span className="badge badge-soft-primary fs-xxs">{isPlugin ? 'Plugin' : 'Theme'}</span>
                  <div className="d-flex flex-wrap gap-1 justify-content-end">
                    {active ? (
                      <span className="badge badge-soft-success fs-xxs">Active</span>
                    ) : (
                      <span className="badge badge-soft-secondary fs-xxs">Inactive</span>
                    )}
                    {updateAvail ? <span className="badge badge-soft-warning fs-xxs">Update</span> : null}
                  </div>
                </div>
                <h6 className="mb-2 text-truncate" title={name}>
                  {detailTo ? (
                    <Link to={detailTo} className="text-reset text-decoration-none">
                      {name || '—'}
                    </Link>
                  ) : (
                    name || '—'
                  )}
                </h6>
                <p className="text-muted fs-xs mb-2">
                  <span className="fw-semibold text-body">Version:</span> {version || '—'}
                </p>
                {author ? (
                  <p className="text-muted fs-xs mb-0">
                    <span className="fw-semibold text-body">Author:</span>{' '}
                    <span className="text-truncate d-inline-block align-bottom" style={{ maxWidth: '100%' }} title={author}>
                      {author}
                    </span>
                  </p>
                ) : null}
              </CardBody>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default SiteInstalledExtensionGrid;
