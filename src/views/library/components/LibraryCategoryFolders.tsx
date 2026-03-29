import type { LibraryFavouritesKindParam } from '@/views/library/components/libraryUrlState';
import type { LibraryCategory } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap';
import { TbChevronLeft, TbChevronRight, TbFolder, TbPackage, TbPalette, TbPencil, TbStar } from 'react-icons/tb';

export type CategoryFolderCounts = {
  byCategoryId: Record<string, number>;
  uncategorized: number;
};

type LibraryCategoryFoldersBaseProps = {
  categories: LibraryCategory[];
  counts: CategoryFolderCounts;
  /** No selection or empty URL → all items; otherwise category `$id`. */
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onEditCategory?: (categoryId: string) => void;
  /** When true, category tiles with zero items in the current context are still listed. */
  showEmptyInGrid?: boolean;
};

type LibraryCategoryFoldersProps = LibraryCategoryFoldersBaseProps &
  (
    | { favouritesUi?: false }
    | {
        favouritesUi: true;
        favouritesKind: LibraryFavouritesKindParam | null;
        onFavouritesKindChange: (k: LibraryFavouritesKindParam | null) => void;
        /** Counts of favourited plugins / themes (for scope folders at the top level). */
        scopeCounts: { plugins: number; themes: number };
      }
  );

/** One row of folder cards: matches Col md={6} lg={4} xxl={3} → 2 / 3 / 4 columns. */
function getFolderGridColumnsPerRow(): number {
  if (typeof window === 'undefined') return 4;
  if (window.matchMedia('(min-width: 1400px)').matches) return 4;
  if (window.matchMedia('(min-width: 992px)').matches) return 3;
  if (window.matchMedia('(min-width: 768px)').matches) return 2;
  return 1;
}

type FolderEntry =
  | { key: 'all'; kind: 'all'; total: number }
  | { key: 'all_scope'; kind: 'all_scope'; total: number; bucket: LibraryFavouritesKindParam }
  | { key: string; kind: 'scope'; scope: LibraryFavouritesKindParam; count: number }
  | { key: string; kind: 'category'; cat: LibraryCategory; count: number };

function totalLibraryItemCount(counts: CategoryFolderCounts): number {
  const inCategories = Object.values(counts.byCategoryId).reduce((sum, n) => sum + n, 0);
  return counts.uncategorized + inCategories;
}

const LibraryCategoryFolders = (props: LibraryCategoryFoldersProps) => {
  const {
    categories,
    counts,
    selectedCategoryId,
    onSelectCategory,
    onEditCategory,
    showEmptyInGrid = false,
  } = props;

  const favouritesUi = props.favouritesUi === true;
  const favouritesKind = favouritesUi ? props.favouritesKind : null;
  const onFavouritesKindChange = favouritesUi ? props.onFavouritesKindChange : undefined;
  const scopeCounts = favouritesUi ? props.scopeCounts : { plugins: 0, themes: 0 };

  const [startIndex, setStartIndex] = useState(0);
  const [viewportSize, setViewportSize] = useState(getFolderGridColumnsPerRow);

  useEffect(() => {
    const read = () => setViewportSize(getFolderGridColumnsPerRow());
    read();
    const queries = ['(min-width: 1400px)', '(min-width: 992px)', '(min-width: 768px)'];
    const mqs = queries.map((q) => window.matchMedia(q));
    mqs.forEach((m) => m.addEventListener('change', read));
    return () => mqs.forEach((m) => m.removeEventListener('change', read));
  }, []);

  const entries: FolderEntry[] = useMemo(() => {
    if (favouritesUi && favouritesKind == null) {
      const list: FolderEntry[] = [];
      if (scopeCounts.plugins > 0) {
        list.push({ key: 'scope-plugins', kind: 'scope', scope: 'plugins', count: scopeCounts.plugins });
      }
      if (scopeCounts.themes > 0) {
        list.push({ key: 'scope-themes', kind: 'scope', scope: 'themes', count: scopeCounts.themes });
      }
      return list;
    }

    if (favouritesUi && favouritesKind != null) {
      const list: FolderEntry[] = [];
      list.push({
        key: 'all_scope',
        kind: 'all_scope',
        total: totalLibraryItemCount(counts),
        bucket: favouritesKind,
      });
      for (const cat of categories) {
        const n = counts.byCategoryId[cat.$id] ?? 0;
        if (n <= 0 && !showEmptyInGrid) continue;
        list.push({ key: cat.$id, kind: 'category', cat, count: n });
      }
      return list;
    }

    const list: FolderEntry[] = [{ key: 'all', kind: 'all', total: totalLibraryItemCount(counts) }];
    for (const cat of categories) {
      const n = counts.byCategoryId[cat.$id] ?? 0;
      if (n <= 0 && !showEmptyInGrid) continue;
      list.push({ key: cat.$id, kind: 'category', cat, count: n });
    }
    return list;
  }, [
    categories,
    counts,
    favouritesUi,
    favouritesKind,
    scopeCounts.plugins,
    scopeCounts.themes,
    showEmptyInGrid,
  ]);

  const maxStart = Math.max(0, entries.length - viewportSize);

  useEffect(() => {
    setStartIndex((i) => Math.min(i, maxStart));
  }, [maxStart]);

  useEffect(() => {
    setStartIndex(0);
  }, [categories, favouritesKind, favouritesUi, showEmptyInGrid]);

  const visibleEntries = useMemo(
    () => entries.slice(startIndex, startIndex + viewportSize),
    [entries, startIndex, viewportSize],
  );

  const canPrev = startIndex > 0;
  const canNext = startIndex < maxStart;

  const slidePrev = () => {
    if (!canPrev) return;
    setStartIndex((i) => Math.max(0, i - 1));
  };

  const slideNext = () => {
    if (!canNext) return;
    setStartIndex((i) => Math.min(maxStart, i + 1));
  };

  /** Favourites “all” is the star crumb; this is only for the non-favourites All Items card. */
  const isAllItemsCardSelected = !favouritesUi && !selectedCategoryId;

  /** Star highlights when the grid shows Plugins + Themes only. */
  const isStarRootActive =
    favouritesUi && favouritesKind == null && !selectedCategoryId;

  const isAllInBucketSelected =
    favouritesUi && favouritesKind != null && !selectedCategoryId;

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    const c = categories.find((x) => x.$id === selectedCategoryId);
    return c?.name ?? null;
  }, [categories, selectedCategoryId]);

  const palette = ['primary', 'success', 'warning', 'info', 'danger'] as const;

  const inactiveAllIcon = 'avatar-md bg-primary bg-opacity-10 text-primary rounded-2 flex-shrink-0 d-inline-flex align-items-center justify-content-center';
  const activeAllIcon =
    'avatar-md bg-white bg-opacity-25 text-white rounded-2 flex-shrink-0 d-inline-flex align-items-center justify-content-center';

  const scopeIconClass = (active: boolean, muted: 'primary' | 'info') =>
    active
      ? 'avatar-md bg-white bg-opacity-25 text-white rounded-2 flex-shrink-0 d-inline-flex align-items-center justify-content-center'
      : `avatar-md bg-${muted} bg-opacity-10 text-${muted} rounded-2 flex-shrink-0 d-inline-flex align-items-center justify-content-center`;

  const handleFavouritesRoot = () => {
    onFavouritesKindChange?.(null);
    onSelectCategory(null);
  };

  const crumbClass = 'btn btn-link p-0 text-decoration-none fs-sm py-0';
  const crumbMuted = 'text-muted user-select-none px-1';

  return (
    <div className="d-flex align-items-stretch gap-2 mb-3">
      <div className="d-flex align-items-center flex-shrink-0 align-self-center">
        <Button
          variant="light"
          className="btn-icon rounded-2 border"
          type="button"
          disabled={!canPrev}
          aria-label="Show previous folder"
          onClick={slidePrev}
        >
          <TbChevronLeft className="fs-lg" />
        </Button>
      </div>

      <div className="flex-grow-1 min-w-0">
        {favouritesUi ? (
          <nav className="d-flex flex-wrap align-items-center gap-1 mb-2" aria-label="Favourites folder path">
            <button
              type="button"
              className={`btn btn-sm p-1 rounded-2 border-0 ${isStarRootActive ? 'bg-warning bg-opacity-15 text-warning' : 'btn-light text-muted'}`}
              aria-current={isStarRootActive ? 'page' : undefined}
              aria-label="All favourites"
              title="All favourites"
              onClick={handleFavouritesRoot}
            >
              <TbStar className="fs-5" />
            </button>
            {favouritesKind ? (
              <>
                <span className={crumbMuted} aria-hidden>
                  ›
                </span>
                <button
                  type="button"
                  className={`${crumbClass} ${!selectedCategoryId ? 'fw-semibold text-body' : 'text-body-secondary'}`}
                  onClick={() => {
                    onSelectCategory(null);
                  }}
                >
                  {favouritesKind === 'plugins' ? 'Plugins' : 'Themes'}
                </button>
              </>
            ) : null}
            {selectedCategoryId && selectedCategoryName ? (
              <>
                <span className={crumbMuted} aria-hidden>
                  ›
                </span>
                <button
                  type="button"
                  className={`${crumbClass} fw-semibold text-body text-start`}
                  style={{ maxWidth: '12rem' }}
                  title="Clear category filter"
                  onClick={() => onSelectCategory(null)}
                >
                  <span className="text-truncate d-inline-block align-bottom w-100">{selectedCategoryName}</span>
                </button>
              </>
            ) : favouritesKind && !selectedCategoryId ? (
              <>
                <span className={crumbMuted} aria-hidden>
                  ›
                </span>
                <span className="fs-sm text-muted">Categories</span>
              </>
            ) : null}
          </nav>
        ) : null}

        <Row className="g-2">
          {visibleEntries.map((entry) => {
            if (entry.kind === 'all') {
              const on = isAllItemsCardSelected;
              return (
                <Col md={6} lg={4} xxl={3} key={entry.key}>
                  <Card
                    className={`mb-0 ${on ? 'bg-primary text-white border border-primary shadow-sm' : 'border border-dashed'}`}
                  >
                    <CardBody className="p-2">
                      <button
                        type="button"
                        className={`d-flex align-items-center justify-content-between gap-2 w-100 text-start border-0 p-0 ${on ? 'bg-transparent text-white' : 'bg-transparent text-body'}`}
                        onClick={() => onSelectCategory(null)}
                      >
                        <div className="d-flex align-items-center gap-2 min-w-0">
                          <span className={on ? activeAllIcon : inactiveAllIcon}>
                            <TbFolder className="fs-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="fw-semibold fs-sm text-truncate">All Items</div>
                            <p className={`mb-0 fs-xs ${on ? 'text-white-50' : 'text-muted'}`}>
                              {entry.total} items
                            </p>
                          </div>
                        </div>
                      </button>
                    </CardBody>
                  </Card>
                </Col>
              );
            }

            if (entry.kind === 'scope') {
              const atRoot = favouritesUi && favouritesKind == null;
              const active = atRoot
                ? false
                : favouritesKind === entry.scope && !selectedCategoryId;
              const isPlugins = entry.scope === 'plugins';
              return (
                <Col md={6} lg={4} xxl={3} key={entry.key}>
                  <Card
                    className={`mb-0 ${active ? 'bg-primary text-white border border-primary shadow-sm' : 'border border-dashed'}`}
                  >
                    <CardBody className="p-2">
                      <button
                        type="button"
                        className={`d-flex align-items-center justify-content-between gap-2 w-100 text-start border-0 p-0 ${active ? 'bg-transparent text-white' : 'bg-transparent text-body'}`}
                        onClick={() => {
                          onSelectCategory(null);
                          onFavouritesKindChange?.(entry.scope);
                        }}
                      >
                        <div className="d-flex align-items-center gap-2 min-w-0">
                          <span className={scopeIconClass(active, isPlugins ? 'primary' : 'info')}>
                            {isPlugins ? <TbPackage className="fs-4" /> : <TbPalette className="fs-4" />}
                          </span>
                          <div className="min-w-0">
                            <div className="fw-semibold fs-sm text-truncate">
                              {isPlugins ? 'Plugins' : 'Themes'}
                            </div>
                            <p className={`mb-0 fs-xs ${active ? 'text-white-50' : 'text-muted'}`}>
                              {entry.count} favourite{entry.count === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                      </button>
                    </CardBody>
                  </Card>
                </Col>
              );
            }

            if (entry.kind === 'all_scope') {
              const on = isAllInBucketSelected;
              const isPlugins = entry.bucket === 'plugins';
              return (
                <Col md={6} lg={4} xxl={3} key={entry.key}>
                  <Card
                    className={`mb-0 ${on ? 'bg-primary text-white border border-primary shadow-sm' : 'border border-dashed'}`}
                  >
                    <CardBody className="p-2">
                      <button
                        type="button"
                        className={`d-flex align-items-center justify-content-between gap-2 w-100 text-start border-0 p-0 ${on ? 'bg-transparent text-white' : 'bg-transparent text-body'}`}
                        onClick={() => onSelectCategory(null)}
                      >
                        <div className="d-flex align-items-center gap-2 min-w-0">
                          <span className={scopeIconClass(on, isPlugins ? 'primary' : 'info')}>
                            {isPlugins ? <TbPackage className="fs-4" /> : <TbPalette className="fs-4" />}
                          </span>
                          <div className="min-w-0">
                            <div className="fw-semibold fs-sm text-truncate">
                              All {isPlugins ? 'plugins' : 'themes'}
                            </div>
                            <p className={`mb-0 fs-xs ${on ? 'text-white-50' : 'text-muted'}`}>
                              {entry.total} items
                            </p>
                          </div>
                        </div>
                      </button>
                    </CardBody>
                  </Card>
                </Col>
              );
            }

            const { cat, count: n } = entry;
            const active = selectedCategoryId === cat.$id;
            const variant =
              cat.color && palette.includes(cat.color as (typeof palette)[number])
                ? (cat.color as (typeof palette)[number])
                : 'primary';
            const inactiveIcon = `avatar-md bg-${variant} bg-opacity-10 text-${variant} rounded-2 flex-shrink-0 d-inline-flex align-items-center justify-content-center`;

            return (
              <Col md={6} lg={4} xxl={3} key={entry.key}>
                <Card
                  className={`mb-0 ${active ? 'bg-primary text-white border border-primary shadow-sm' : 'border border-dashed'}`}
                >
                  <CardBody className="p-2 position-relative pe-4">
                    <button
                      type="button"
                      className={`d-flex align-items-center justify-content-between gap-2 w-100 text-start border-0 p-0 ${active ? 'bg-transparent text-white' : 'bg-transparent text-body'}`}
                      onClick={() => onSelectCategory(active ? null : cat.$id)}
                      title={cat.name}
                    >
                      <div className="d-flex align-items-center gap-2 min-w-0">
                        <span
                          className={
                            active
                              ? 'avatar-md bg-white bg-opacity-25 text-white rounded-2 flex-shrink-0 d-inline-flex align-items-center justify-content-center'
                              : inactiveIcon
                          }
                        >
                          <TbFolder className="fs-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="fw-semibold fs-sm text-truncate" title={cat.name}>
                            {cat.name}
                          </div>
                          <p className={`mb-0 fs-xs ${active ? 'text-white-50' : 'text-muted'}`}>
                            {n} items
                          </p>
                        </div>
                      </div>
                    </button>
                    {onEditCategory ? (
                      <button
                        type="button"
                        className={`btn btn-link p-1 position-absolute top-0 end-0 mt-1 me-1 lh-1 border-0 z-1 ${
                          active ? 'text-white-50' : 'text-body-secondary'
                        }`}
                        aria-label={`Edit folder ${cat.name}`}
                        title="Edit folder"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditCategory(cat.$id);
                        }}
                      >
                        <TbPencil className="fs-5" />
                      </button>
                    ) : null}
                  </CardBody>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      <div className="d-flex align-items-center flex-shrink-0 align-self-center">
        <Button
          variant="light"
          className="btn-icon rounded-2 border"
          type="button"
          disabled={!canNext}
          aria-label="Show next folder"
          onClick={slideNext}
        >
          <TbChevronRight className="fs-lg" />
        </Button>
      </div>
    </div>
  );
};

export default LibraryCategoryFolders;
