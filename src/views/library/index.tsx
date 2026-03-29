import {
  buildCategoryPathById,
  buildLibraryDashboardRows,
  libraryCategoriesForItemKind,
  libraryCategoriesForItemsView,
} from '@/domains/library';
import { useLibraryItems } from '@/hooks/useLibrary';
import { useLibraryCollections, useLibraryFamilies } from '@/hooks/useLibraryFamiliesAndCollections';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';
import LibraryCategoryFolders from '@/views/library/components/LibraryCategoryFolders';
import CreateCategoryModal from '@/views/library/components/CreateCategoryModal';
import EditCategoryModal from '@/views/library/components/EditCategoryModal';
import AddLibraryTagModal from '@/views/library/modals/AddLibraryTagModal';
import LibraryFileManagerSidebar from '@/views/library/components/LibraryFileManagerSidebar';
import {
  parseFavouritesKind,
  parseLibraryView,
  setLibraryParams,
  type LibraryFavouritesKindParam,
  type LibraryViewParam,
} from '@/views/library/components/libraryUrlState';
import CollectionsSection from '@/views/library/components/CollectionsSection';
import FamiliesSection from '@/views/library/components/FamiliesSection';
import LibraryItemsSection from '@/views/library/components/LibraryItemsSection';
import ViewModeToggle, { type LibraryViewMode } from '@/views/library/components/ViewModeToggle';
import {
  collectAllTagsFromRows,
  computeCategoryFolderCounts,
  computeSidebarCounts,
  filterLibraryRows,
} from '@/views/library/libraryFilters';
import AddFromWordPressModal from '@/views/library/modals/AddFromWordPressModal';
import AddLibrarySourceModal from '@/views/library/modals/AddLibrarySourceModal';
import AddRemoteUrlModal from '@/views/library/modals/AddRemoteUrlModal';
import type { AddLibrarySourcePayload } from '@/views/library/modals/addLibraryTypes';
import UploadLibraryModal from '@/views/library/modals/UploadLibraryModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { Button, Card, CardHeader, Col, Container, Offcanvas, Row, Spinner } from 'react-bootstrap';
import { LuSearch } from 'react-icons/lu';
import { TbMenu2 } from 'react-icons/tb';
import SimpleBar from 'simplebar-react';
import { useSearchParams } from 'react-router';

function viewFromSearchParams(params: URLSearchParams): LibraryViewParam {
  const tab = params.get('tab');
  if (tab === 'families') return 'families';
  if (tab === 'collections') return 'collections';
  if (tab === 'items') return 'plugins';
  return parseLibraryView(params.get('view'));
}

const TAB_SUB: Record<LibraryViewParam, string> = {
  all: 'All plugins and themes in your library.',
  plugins: 'Plugins in your library.',
  themes: 'Themes in your library.',
  families: 'Group related slugs for installs.',
  collections: 'Bundles for batch install on sites.',
  local: 'Items with at least one uploaded (local) version.',
  favourites: 'Items you marked as favourite.',
};

const DEFAULT_VIEWS: Record<'items' | 'families' | 'collections', LibraryViewMode> = {
  items: 'table',
  families: 'table',
  collections: 'table',
};

const SHOW_EMPTY_CATEGORY_FOLDERS_KEY = '__WPHUBPRO_LIBRARY_SHOW_EMPTY_CATEGORY_FOLDERS__';

const LibraryPage = () => {
  const [params, setParams] = useSearchParams();
  const view = viewFromSearchParams(params);
  const tag = params.get('tag');
  const categoryParam = params.get('category');
  const q = params.get('q') ?? '';
  const favKindParam = parseFavouritesKind(params.get('favKind'));

  const setView = (v: LibraryViewParam) => setLibraryParams(setParams, { view: v });
  const setTag = (t: string | null) => setLibraryParams(setParams, { tag: t });
  const setCategory = (c: string | null) => setLibraryParams(setParams, { category: c });
  const setQ = (next: string) => setLibraryParams(setParams, { q: next });
  const setFavKind = useCallback(
    (k: LibraryFavouritesKindParam | null) => setLibraryParams(setParams, { favKind: k }),
    [setParams],
  );

  const [offcanvasShow, setOffcanvasShow] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [wpOpen, setWpOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [addRemoteInitialName, setAddRemoteInitialName] = useState<string | undefined>(undefined);
  const [prefill, setPrefill] = useState<{ slug: string; name: string } | null>(null);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [addTagOpen, setAddTagOpen] = useState(false);

  const [viewBySection, setViewBySection] = useState(DEFAULT_VIEWS);
  const [searchBySection, setSearchBySection] = useState({ families: '', collections: '' });
  const [showEmptyCategoryFolders, setShowEmptyCategoryFolders] = useLocalStorage(
    SHOW_EMPTY_CATEGORY_FOLDERS_KEY,
    false,
  );

  const { data: libraryItems = [], isLoading: itemsLoading, isError: itemsError, error: itemsErr } =
    useLibraryItems();
  const { data: families = [], isLoading: familiesLoading } = useLibraryFamilies();
  const { data: collections = [], isLoading: collectionsLoading } = useLibraryCollections();
  const { data: categories = [] } = useLibraryCategories();

  const editingCategory = useMemo(
    () => (editCategoryId ? categories.find((c) => c.$id === editCategoryId) ?? null : null),
    [categories, editCategoryId],
  );

  useEffect(() => {
    if (editCategoryId && !categories.some((c) => c.$id === editCategoryId)) {
      setEditCategoryId(null);
    }
  }, [editCategoryId, categories]);

  const categoryNameById = useMemo(() => buildCategoryPathById(categories), [categories]);

  const categoriesForItemsView = useMemo(
    () => libraryCategoriesForItemsView(view, categories),
    [view, categories],
  );

  const categoriesForFavouritesFolderLevel = useMemo(() => {
    if (view !== 'favourites' || !favKindParam) return categoriesForItemsView;
    return libraryCategoriesForItemKind(favKindParam === 'plugins' ? 'plugin' : 'theme', categories);
  }, [view, favKindParam, categories, categoriesForItemsView]);

  const libraryRows = useMemo(
    () => buildLibraryDashboardRows(libraryItems, categoryNameById),
    [libraryItems, categoryNameById],
  );

  const favouritesKindForFilter = view === 'favourites' ? favKindParam : null;

  /** Same as table filters but without category — drives folder strip (plugins/themes/local/fav/tag/search). */
  const folderContextRows = useMemo(
    () =>
      filterLibraryRows(libraryRows, {
        view,
        tag,
        categoryId: null,
        q,
        favouritesKind: favouritesKindForFilter,
      }),
    [libraryRows, view, tag, q, favouritesKindForFilter],
  );

  const filteredRows = useMemo(
    () =>
      filterLibraryRows(libraryRows, {
        view,
        tag,
        categoryId: categoryParam,
        q,
        favouritesKind: favouritesKindForFilter,
      }),
    [libraryRows, view, tag, categoryParam, q, favouritesKindForFilter],
  );

  const favScopeCounts = useMemo(() => {
    if (view !== 'favourites') return { plugins: 0, themes: 0 };
    const rows = filterLibraryRows(libraryRows, {
      view: 'favourites',
      tag,
      categoryId: null,
      q,
      favouritesKind: null,
    });
    return {
      plugins: rows.filter((r) => r.kind === 'plugin').length,
      themes: rows.filter((r) => r.kind === 'theme').length,
    };
  }, [libraryRows, view, tag, q]);

  const sidebarCounts = useMemo(() => {
    const base = computeSidebarCounts(libraryRows);
    return {
      ...base,
      families: families.length,
      collections: collections.length,
    };
  }, [libraryRows, families.length, collections.length]);

  const allTags = useMemo(() => collectAllTagsFromRows(libraryRows), [libraryRows]);
  const folderCounts = useMemo(
    () => computeCategoryFolderCounts(folderContextRows),
    [folderContextRows],
  );

  const itemsListView =
    view === 'all' ||
    view === 'plugins' ||
    view === 'themes' ||
    view === 'local' ||
    view === 'favourites';

  useEffect(() => {
    if (view !== 'favourites' && favKindParam) {
      setFavKind(null);
    }
  }, [view, favKindParam, setFavKind]);

  useEffect(() => {
    if (view !== 'favourites' || !favKindParam) return;
    const n =
      favKindParam === 'plugins' ? favScopeCounts.plugins : favScopeCounts.themes;
    if (n === 0) setFavKind(null);
  }, [view, favKindParam, favScopeCounts.plugins, favScopeCounts.themes, setFavKind]);

  useEffect(() => {
    if (!itemsListView || !categoryParam) return;
    if (categoryParam === 'uncategorized') {
      if (folderCounts.uncategorized === 0) setCategory(null);
      return;
    }
    const allowedForCategory =
      view === 'favourites' && favKindParam
        ? libraryCategoriesForItemKind(favKindParam === 'plugins' ? 'plugin' : 'theme', categories)
        : categoriesForItemsView;
    const allowedIds = new Set(allowedForCategory.map((c) => c.$id));
    if (!allowedIds.has(categoryParam)) {
      setCategory(null);
      return;
    }
    if ((folderCounts.byCategoryId[categoryParam] ?? 0) === 0) {
      setCategory(null);
    }
  }, [
    itemsListView,
    categoryParam,
    folderCounts.uncategorized,
    folderCounts.byCategoryId,
    categoriesForItemsView,
    view,
    favKindParam,
    categories,
    setCategory,
  ]);

  const loading =
    view === 'families'
      ? familiesLoading
      : view === 'collections'
        ? collectionsLoading
        : itemsLoading;

  const listSubtitle =
    tag && itemsListView
      ? `Items tagged “${tag}” (plugins and themes).`
      : TAB_SUB[view];

  const clearPrefill = () => setPrefill(null);

  const handleAddSourceChoice = (payload: AddLibrarySourcePayload) => {
    if (payload.mode === 'direct') {
      clearPrefill();
      if (payload.source === 'wordpress.org') setWpOpen(true);
      else if (payload.source === 'library_upload') setUploadOpen(true);
      else if (payload.source === 'remote_url') {
        setAddRemoteInitialName(undefined);
        setRemoteOpen(true);
      }
    } else {
      const { pluginName, pluginSlug, source } = payload;
      setPrefill({ slug: pluginSlug, name: pluginName });
      if (source === 'wordpress.org') setWpOpen(true);
      else if (source === 'library_upload') setUploadOpen(true);
      else if (source === 'remote_url') {
        setAddRemoteInitialName(pluginName);
        setRemoteOpen(true);
      }
    }
  };

  const isPluginsView = view !== 'themes';
  const uploadInitialType = view === 'themes' ? 'theme' : 'plugin';

  const mainKey: 'items' | 'families' | 'collections' =
    view === 'families' ? 'families' : view === 'collections' ? 'collections' : 'items';

  return (
    <Container fluid>
      <div className="outlook-box outlook-box-full gap-1">
        <Offcanvas
          responsive="lg"
          show={offcanvasShow}
          onHide={() => setOffcanvasShow(false)}
          className="outlook-left-menu outlook-left-menu-md"
        >
          <LibraryFileManagerSidebar
            view={view}
            onViewChange={(v) => {
              if (v === 'favourites' && view !== 'favourites') {
                setLibraryParams(setParams, { view: v, favKind: null, category: null });
              } else {
                setView(v);
              }
              setOffcanvasShow(false);
            }}
            tag={tag}
            onTagChange={setTag}
            allTags={allTags}
            categoryId={categoryParam}
            onCategoryPick={setCategory}
            allCategories={categories}
            visibleCategories={categoriesForItemsView}
            counts={sidebarCounts}
            onAddItem={() => setAddSourceOpen(true)}
            onCreateCategory={() => setCreateCategoryOpen(true)}
            onAddTag={() => setAddTagOpen(true)}
            showEmptyCategoryFolders={showEmptyCategoryFolders}
            onShowEmptyCategoryFoldersChange={setShowEmptyCategoryFolders}
          />
        </Offcanvas>

        <Card className="h-100 mb-0 rounded-0 flex-grow-1 border-0">
          <CardHeader className="border-light justify-content-between flex-wrap gap-2">
            <div className="d-flex gap-2 flex-grow-1 align-items-center min-w-0">
              <div className="d-lg-none">
                <Button variant="default" className="btn-icon" type="button" onClick={() => setOffcanvasShow(true)}>
                  <TbMenu2 className="fs-lg" />
                </Button>
              </div>
              <div className="app-search flex-grow-1" style={{ minWidth: '12rem', maxWidth: '24rem' }}>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search library"
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </div>
            <div className="d-none d-md-flex align-items-center gap-2">
              <ViewModeToggle
                idPrefix={`library-${mainKey}`}
                value={viewBySection[mainKey]}
                onChange={(mode) =>
                  setViewBySection((prev) => ({
                    ...prev,
                    [mainKey]: mode,
                  }))
                }
              />
            </div>
          </CardHeader>

          <SimpleBar className="card-body pt-0" style={{ minHeight: '420px' }} data-simplebar-md>
            <Row className="g-0">
              <Col xs={12} className="px-3 pt-2">
                {!itemsListView && <p className="text-muted small mb-2">{listSubtitle}</p>}
                {itemsListView && tag && (
                  <p className="text-muted small mb-2 mb-md-0">{`Items tagged “${tag}”.`}</p>
                )}

                {itemsError && itemsListView && (
                  <p className="text-danger small">
                    {itemsErr instanceof Error ? itemsErr.message : 'Could not load library.'}
                  </p>
                )}

                {loading ? (
                  <div className="d-flex justify-content-center py-5">
                    <Spinner animation="border" role="status" variant="primary">
                      <span className="visually-hidden">Loading…</span>
                    </Spinner>
                  </div>
                ) : (
                  <>
                    {itemsListView && !itemsError && (
                        <>
                          <LibraryCategoryFolders
                            {...(view === 'favourites'
                              ? {
                                  favouritesUi: true as const,
                                  favouritesKind: favKindParam,
                                  onFavouritesKindChange: setFavKind,
                                  scopeCounts: favScopeCounts,
                                  categories: categoriesForFavouritesFolderLevel,
                                }
                              : {
                                  categories: categoriesForItemsView,
                                })}
                            counts={folderCounts}
                            selectedCategoryId={categoryParam}
                            onSelectCategory={(id) => setCategory(id)}
                            onEditCategory={(id) => {
                              setEditCategoryId(id);
                              setOffcanvasShow(false);
                            }}
                            showEmptyInGrid={showEmptyCategoryFolders}
                          />
                          <LibraryItemsSection
                            rows={filteredRows}
                            view={viewBySection.items}
                            categories={categories}
                          />
                        </>
                      )}

                    {view === 'families' && (
                      <FamiliesSection
                        families={families}
                        view={viewBySection.families}
                        search={searchBySection.families}
                        onSearchChange={(v) => setSearchBySection((s) => ({ ...s, families: v }))}
                      />
                    )}

                    {view === 'collections' && (
                      <CollectionsSection
                        collections={collections}
                        view={viewBySection.collections}
                        search={searchBySection.collections}
                        onSearchChange={(v) => setSearchBySection((s) => ({ ...s, collections: v }))}
                      />
                    )}
                  </>
                )}
              </Col>
            </Row>
          </SimpleBar>
        </Card>
      </div>

      <AddLibrarySourceModal
        show={addSourceOpen}
        onHide={() => setAddSourceOpen(false)}
        isPluginsView={isPluginsView}
        onChooseSource={handleAddSourceChoice}
        existingPluginSlug={prefill?.slug}
        existingPluginName={prefill?.name}
      />
      <AddFromWordPressModal
        show={wpOpen}
        onHide={() => {
          setWpOpen(false);
          clearPrefill();
        }}
        itemKind={isPluginsView ? 'plugin' : 'theme'}
        prefillPluginSlug={prefill?.slug}
        prefillPluginName={prefill?.name}
      />
      <UploadLibraryModal
        show={uploadOpen}
        onHide={() => {
          setUploadOpen(false);
          clearPrefill();
        }}
        initialType={uploadInitialType}
        prefillPluginSlug={prefill?.slug}
      />
      <AddRemoteUrlModal
        show={remoteOpen}
        onHide={() => {
          setRemoteOpen(false);
          clearPrefill();
          setAddRemoteInitialName(undefined);
        }}
        existingPluginSlug={prefill?.slug}
        existingPluginName={prefill?.name}
        initialPluginName={addRemoteInitialName}
      />
      <CreateCategoryModal
        show={createCategoryOpen}
        onHide={() => setCreateCategoryOpen(false)}
      />
      <EditCategoryModal
        show={editCategoryId != null && editingCategory != null}
        category={editingCategory}
        onHide={() => setEditCategoryId(null)}
      />
      <AddLibraryTagModal show={addTagOpen} onHide={() => setAddTagOpen(false)} rows={libraryRows} />
    </Container>
  );
};

export default LibraryPage;
