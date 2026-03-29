import type { LibraryCategory } from '@/types';
import SimpleBar from 'simplebar-react';
import { Button, CardBody, Form, ListGroup, ListGroupItem } from 'react-bootstrap';
import type { IconType } from 'react-icons';
import {
  TbBookmark,
  TbCloudDownload,
  TbFolder,
  TbHeart,
  TbPackage,
  TbPalette,
  TbPlus,
  TbUsersGroup,
} from 'react-icons/tb';
import LibrarySidebarCategoryTree from './LibrarySidebarCategoryTree';
import type { LibraryViewParam } from './libraryUrlState';

export type LibrarySidebarCounts = {
  plugins: number;
  themes: number;
  families: number;
  collections: number;
  local: number;
  favourites: number;
};

type LibraryFileManagerSidebarProps = {
  view: LibraryViewParam;
  onViewChange: (v: LibraryViewParam) => void;
  tag: string | null;
  onTagChange: (tag: string | null) => void;
  allTags: string[];
  categoryId: string | null;
  onCategoryPick: (id: string | null) => void;
  /** All categories (persisted order / drag merge). */
  allCategories: LibraryCategory[];
  /** Categories shown for the current items tab (scope filter). */
  visibleCategories: LibraryCategory[];
  counts: LibrarySidebarCounts;
  onAddItem: () => void;
  onCreateCategory: () => void;
  onAddTag: () => void;
  showEmptyCategoryFolders: boolean;
  onShowEmptyCategoryFoldersChange: (value: boolean) => void;
};

function NavRow({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: IconType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <ListGroupItem
      as="button"
      type="button"
      action
      active={active}
      className="d-flex align-items-center justify-content-between gap-2"
      onClick={onClick}
    >
      <span className="d-flex align-items-center gap-2 min-w-0">
        <Icon className="align-middle flex-shrink-0 opacity-75 fs-lg" />
        <span className="align-middle text-truncate">{label}</span>
      </span>
      {badge != null && badge > 0 && (
        <span className="badge bg-danger-subtle text-danger fs-xxs flex-shrink-0">{badge}</span>
      )}
    </ListGroupItem>
  );
}

const LibraryFileManagerSidebar = ({
  view,
  onViewChange,
  tag,
  onTagChange,
  allTags,
  categoryId,
  onCategoryPick,
  allCategories,
  visibleCategories,
  counts,
  onAddItem,
  onCreateCategory,
  onAddTag,
  showEmptyCategoryFolders,
  onShowEmptyCategoryFoldersChange,
}: LibraryFileManagerSidebarProps) => {
  const itemBrowseViews =
    view === 'all' ||
    view === 'plugins' ||
    view === 'themes' ||
    view === 'local' ||
    view === 'favourites';

  return (
    <SimpleBar className="card h-100 mb-0 rounded-0 border-0">
      <CardBody>
        <Button variant="danger" className="fw-medium w-100" type="button" onClick={onAddItem}>
          Add library item
        </Button>

        <ListGroup variant="flush" className="list-custom mt-3">
          <ListGroupItem className="text-muted small fw-semibold text-uppercase py-2 border-0">Items</ListGroupItem>
          <NavRow
            icon={TbPackage}
            label="Plugins"
            active={view === 'plugins' && !tag}
            onClick={() => {
              onTagChange(null);
              onCategoryPick(null);
              onViewChange('plugins');
            }}
            badge={counts.plugins}
          />
          <NavRow
            icon={TbPalette}
            label="Themes"
            active={view === 'themes' && !tag}
            onClick={() => {
              onTagChange(null);
              onCategoryPick(null);
              onViewChange('themes');
            }}
            badge={counts.themes}
          />
          <NavRow
            icon={TbUsersGroup}
            label="Families"
            active={view === 'families'}
            onClick={() => onViewChange('families')}
            badge={counts.families}
          />
          <NavRow
            icon={TbFolder}
            label="Collections"
            active={view === 'collections'}
            onClick={() => onViewChange('collections')}
            badge={counts.collections}
          />
          <NavRow
            icon={TbCloudDownload}
            label="Local storage"
            active={view === 'local' && !tag}
            onClick={() => {
              onTagChange(null);
              onCategoryPick(null);
              onViewChange('local');
            }}
            badge={counts.local}
          />
          <NavRow
            icon={TbHeart}
            label="Favourites"
            active={view === 'favourites' && !tag}
            onClick={() => {
              onTagChange(null);
              onCategoryPick(null);
              onViewChange('favourites');
            }}
            badge={counts.favourites}
          />

          <ListGroupItem className="mt-2 d-flex align-items-center justify-content-between text-muted small fw-semibold text-uppercase py-2 border-0">
            <span>Categories</span>
            <Button variant="link" className="p-0 fs-lg text-primary" type="button" onClick={onCreateCategory} aria-label="Add category">
              <TbPlus />
            </Button>
          </ListGroupItem>
          <ListGroupItem className="border-0 py-2 pt-0">
            <Form.Check
              type="checkbox"
              id="wphub-library-show-empty-category-folders"
              className="small text-muted mb-0"
              checked={showEmptyCategoryFolders}
              onChange={(e) => onShowEmptyCategoryFoldersChange(e.target.checked)}
              label="Show empty categories in grid"
            />
          </ListGroupItem>
          <LibrarySidebarCategoryTree
            allCategories={allCategories}
            visibleCategories={visibleCategories}
            categoryId={categoryId}
            itemBrowseViews={itemBrowseViews}
            onTagChange={onTagChange}
            onCategoryPick={onCategoryPick}
            onViewChange={onViewChange}
          />

          <ListGroupItem className="mt-2 d-flex align-items-center justify-content-between text-muted small fw-semibold text-uppercase py-2 border-0">
            <span>Tags</span>
            <Button variant="link" className="p-0 fs-lg text-primary" type="button" onClick={onAddTag} aria-label="Add tag">
              <TbPlus />
            </Button>
          </ListGroupItem>
          {allTags.length === 0 ? (
            <ListGroupItem className="text-muted small border-0 py-2">No tags yet</ListGroupItem>
          ) : (
            allTags.map((t) => (
              <ListGroupItem
                key={t}
                as="button"
                type="button"
                action
                active={tag === t && itemBrowseViews}
                className="py-2 ps-3"
                onClick={() => {
                  onCategoryPick(null);
                  if (tag === t) {
                    onTagChange(null);
                    onViewChange('plugins');
                  } else {
                    onTagChange(t);
                    onViewChange('all');
                  }
                }}
              >
                <TbBookmark className="align-middle me-1 opacity-75" />
                <span className="align-middle">{t}</span>
              </ListGroupItem>
            ))
          )}
        </ListGroup>
      </CardBody>
    </SimpleBar>
  );
};

export default LibraryFileManagerSidebar;
