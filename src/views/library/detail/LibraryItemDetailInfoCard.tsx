import { decodeHtmlEntities } from '@/domains/library';
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import { TbExternalLink } from 'react-icons/tb';

type LibraryItemDetailInfoCardProps = {
  displayName: string;
  itemKind: 'plugin' | 'theme';
  descriptionShort: string;
  latestReleaseLabel: string;
  authorLabel: string;
  authorHref?: string;
  projectHref?: string;
};

const LibraryItemDetailInfoCard = ({
  displayName,
  itemKind,
  descriptionShort,
  latestReleaseLabel,
  authorLabel,
  authorHref,
  projectHref,
}: LibraryItemDetailInfoCardProps) => {
  const kindLabel = itemKind === 'plugin' ? 'Plugin' : 'Theme';

  return (
    <div className="position-sticky align-self-start z-3" style={{ top: '0.75rem' }}>
      <Card className="bg-dark text-white border-secondary border-opacity-25 shadow">
        <CardHeader className="border-secondary border-opacity-25 bg-transparent text-white">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
            <CardTitle as="h4" className="mb-0 text-white">
              Item details
            </CardTitle>
            <span className={`badge badge-soft-${itemKind === 'plugin' ? 'warning' : 'info'} fs-xxs`}>
              {kindLabel}
            </span>
          </div>
        </CardHeader>
        <CardBody className="pt-0 text-white">
          <h5 className="text-white fs-lg fw-semibold mb-2">{decodeHtmlEntities(displayName)}</h5>

          {descriptionShort ? (
            <p className="text-white-50 fs-sm mb-3 mb-0">{decodeHtmlEntities(descriptionShort)}</p>
          ) : (
            <p className="text-white-50 fs-sm mb-3 mb-0">No description in the library.</p>
          )}

          <div className="border-top border-secondary border-opacity-25 pt-3 mt-3">
            <div className="text-white-50 fs-xs mb-1">Latest release</div>
            <div className="fw-medium fs-sm">{latestReleaseLabel || '—'}</div>
          </div>

          <div className="border-top border-secondary border-opacity-25 pt-3 mt-3">
            <div className="text-white-50 fs-xs mb-1">Author</div>
            {authorHref ? (
              <a
                href={authorHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-decoration-underline fs-sm"
              >
                {authorLabel || '—'}
              </a>
            ) : (
              <span className="fs-sm">{authorLabel || '—'}</span>
            )}
            {projectHref ? (
              <div className="mt-2">
                <a
                  href={projectHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-light d-inline-flex align-items-center gap-1"
                >
                  <TbExternalLink />
                  {itemKind === 'plugin' ? 'Plugin on WordPress.org' : 'Theme on WordPress.org'}
                </a>
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default LibraryItemDetailInfoCard;
