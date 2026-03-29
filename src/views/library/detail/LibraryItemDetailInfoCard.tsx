import { ROUTE_PATHS } from '@/config/routePaths';
import type { LibraryCollection, LibraryFamily } from '@/types';
import { decodeHtmlEntities } from '@/domains/library';
import { Button, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import { Link } from 'react-router';
import { TbExternalLink, TbTrash } from 'react-icons/tb';

type LibraryItemDetailInfoCardProps = {
  displayName: string;
  itemKind: 'plugin' | 'theme';
  descriptionShort: string;
  defaultVersionLabel: string;
  latestKnownLabel: string;
  authorLabel: string;
  authorHref?: string;
  projectHref?: string;
  mergedTags: string[];
  families: LibraryFamily[];
  collections: LibraryCollection[];
  routeSlug: string;
  removeDisabled?: boolean;
  onRemoveFromLibrary: () => void;
};

const LibraryItemDetailInfoCard = ({
  displayName,
  itemKind,
  descriptionShort,
  defaultVersionLabel,
  latestKnownLabel,
  authorLabel,
  authorHref,
  projectHref,
  mergedTags,
  families,
  collections,
  routeSlug,
  removeDisabled,
  onRemoveFromLibrary,
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
            <div className="row g-2">
              <div className="col-6">
                <div className="text-white-50 fs-xs">Default version</div>
                <div className="fw-medium fs-sm">{defaultVersionLabel || '—'}</div>
              </div>
              <div className="col-6">
                <div className="text-white-50 fs-xs">Latest known</div>
                <div className="fw-medium fs-sm">{latestKnownLabel || '—'}</div>
              </div>
            </div>
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

          {mergedTags.length > 0 ? (
            <div className="border-top border-secondary border-opacity-25 pt-3 mt-3">
              <div className="text-white-50 fs-xs mb-2">Tags</div>
              <div className="d-flex flex-wrap gap-1">
                {mergedTags.map((t) => (
                  <span key={t} className="badge bg-white bg-opacity-10 text-white fs-xxs fw-normal border border-white border-opacity-25">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {(families.length > 0 || collections.length > 0) && (
            <div className="border-top border-secondary border-opacity-25 pt-3 mt-3">
              <div className="fw-semibold fs-sm text-white mb-2">Membership</div>
              {families.length > 0 ? (
                <div className="mb-2">
                  <div className="text-white-50 fs-xs mb-1">Families</div>
                  <ul className="list-unstyled mb-0 small">
                    {families.map((f) => (
                      <li key={f.$id}>
                        <Link
                          to={`${ROUTE_PATHS.LIBRARY}?view=families`}
                          className="link-light link-underline-opacity-50"
                        >
                          {f.name?.trim() || f.memberSlugs.join(', ') || 'Untitled family'}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {collections.length > 0 ? (
                <div>
                  <div className="text-white-50 fs-xs mb-1">Collections</div>
                  <ul className="list-unstyled mb-0 small">
                    {collections.map((c) => (
                      <li key={c.$id}>
                        <Link
                          to={`${ROUTE_PATHS.LIBRARY}?view=collections`}
                          className="link-light link-underline-opacity-50"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <div className="border-top border-secondary border-opacity-25 pt-3 mt-3 d-flex justify-content-end">
            <Button
              variant="outline-danger"
              size="sm"
              className="d-inline-flex align-items-center gap-1"
              disabled={removeDisabled}
              onClick={onRemoveFromLibrary}
            >
              <TbTrash />
              Remove from library
            </Button>
          </div>

          <p className="text-white-50 fs-xxs mb-0 mt-2">
            Slug: <code className="text-white-50">{routeSlug}</code>
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default LibraryItemDetailInfoCard;
