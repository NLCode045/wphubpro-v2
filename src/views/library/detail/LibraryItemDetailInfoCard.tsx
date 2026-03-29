import { decodeHtmlEntities } from '@/domains/library';
import { Button, Card, CardBody, CardHeader } from 'react-bootstrap';
import { TbExternalLink } from 'react-icons/tb';

type LibraryItemDetailInfoCardProps = {
  displayName: string;
  itemKind: 'plugin' | 'theme';
  descriptionShort: string;
  latestReleaseLabel: string;
  defaultVersionLabel: string;
  authorLabel: string;
  authorHref?: string;
  /** WordPress.org plugins or themes directory URL for this slug. */
  wordpressOrgHref: string;
  /** Author / product site (e.g. plugin homepage), when known. */
  websiteHref?: string;
};

function urlsLookSame(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const norm = (u: URL) =>
      `${u.hostname.replace(/^www\./i, '').toLowerCase()}${u.pathname.replace(/\/$/, '') || '/'}`;
    return norm(ua) === norm(ub);
  } catch {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
}

const LibraryItemDetailInfoCard = ({
  displayName,
  itemKind,
  descriptionShort,
  latestReleaseLabel,
  defaultVersionLabel,
  authorLabel,
  authorHref,
  wordpressOrgHref,
  websiteHref,
}: LibraryItemDetailInfoCardProps) => {
  const kindLabel = itemKind === 'plugin' ? 'Plugin' : 'Theme';
  const showWebsiteLink =
    websiteHref &&
    websiteHref.trim().length > 0 &&
    !urlsLookSame(websiteHref, wordpressOrgHref);

  const wordpressOrgButtonText =
    itemKind === 'plugin' ? 'This plugin at WordPress.org' : 'This theme at WordPress.org';
  const websiteButtonText =
    itemKind === 'plugin' ? 'Visit the plugin website' : 'Visit the theme website';

  return (
    <div className="position-sticky align-self-start z-3" style={{ top: '0.75rem' }}>
      <Card className="bg-dark text-white border-secondary border-opacity-25 shadow">
        <CardHeader className="border-secondary border-opacity-25 bg-transparent text-white pb-3">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 gap-md-3 mb-3">
            <h4 className="text-white fs-lg fw-semibold mb-0 text-break flex-grow-1 min-w-0 pe-2">
              {decodeHtmlEntities(displayName)}
            </h4>
            <span className="badge bg-light text-dark border border-dark border-opacity-10 fs-xxs fw-semibold text-uppercase flex-shrink-0 align-self-start mt-0">
              {kindLabel}
            </span>
          </div>
          <div className="d-flex flex-wrap align-items-baseline justify-content-end gap-3 gap-md-4">
            <p className="text-end text-break mb-0 fs-sm" style={{ maxWidth: '22rem' }}>
              <span className="text-white-50">Latest release </span>
              <span className="text-white fw-medium">{latestReleaseLabel || '—'}</span>
            </p>
            <p className="text-end text-break mb-0 fs-sm" style={{ maxWidth: '22rem' }}>
              <span className="text-white-50">Your default version </span>
              <span className="text-white fw-medium">{defaultVersionLabel || '—'}</span>
            </p>
          </div>
        </CardHeader>
        <CardBody className="pt-0 text-white">
          {descriptionShort ? (
            <p className="text-white-50 fs-sm mb-0">{decodeHtmlEntities(descriptionShort)}</p>
          ) : (
            <p className="text-white-50 fs-sm mb-0">No description in the library.</p>
          )}

          <div className="border-top border-secondary border-opacity-25 pt-3 mt-3">
            <div className="text-white-50 fs-xs mb-2 text-uppercase fw-semibold" style={{ letterSpacing: '0.04em' }}>
              Links
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Button
                as="a"
                href={wordpressOrgHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                size="sm"
                className="d-inline-flex align-items-center gap-1 text-dark text-decoration-none shadow-none"
              >
                <TbExternalLink className="flex-shrink-0" aria-hidden />
                {wordpressOrgButtonText}
              </Button>
              {showWebsiteLink ? (
                <Button
                  as="a"
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  size="sm"
                  className="d-inline-flex align-items-center gap-1 text-dark text-decoration-none shadow-none"
                >
                  <TbExternalLink className="flex-shrink-0" aria-hidden />
                  {websiteButtonText}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="border-top border-secondary border-opacity-25 pt-3 mt-3">
            <div className="text-white-50 fs-xs mb-2 text-uppercase fw-semibold" style={{ letterSpacing: '0.04em' }}>
              Author
            </div>
            {authorHref ? (
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Button
                  as="a"
                  href={authorHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  size="sm"
                  className="d-inline-flex align-items-center gap-1 text-dark text-decoration-none shadow-none"
                >
                  <TbExternalLink className="flex-shrink-0" aria-hidden />
                  {authorLabel || '—'}
                </Button>
              </div>
            ) : (
              <span className="fs-sm text-white">{authorLabel || '—'}</span>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default LibraryItemDetailInfoCard;
