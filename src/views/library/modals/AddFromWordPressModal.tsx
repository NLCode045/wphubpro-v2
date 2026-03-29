import { useCallback, useEffect, useState } from 'react';
import { Button, Form, ListGroup, Modal, Spinner } from 'react-bootstrap';
import { LuSearch } from 'react-icons/lu';
import {
  useAddOfficialPlugin,
  useAddOfficialTheme,
  useLibraryItems,
  useSearchWpPlugins,
  useSearchWpThemes,
} from '@/hooks/useLibrary';
import type { LibraryItemType } from '@/types';

const DEBOUNCE_MS = 400;

type AddFromWordPressModalProps = {
  show: boolean;
  onHide: () => void;
  /** When `theme`, search/add from wordpress.org/themes. */
  itemKind?: LibraryItemType;
  prefillPluginSlug?: string;
  prefillPluginName?: string;
  initialSearchTerm?: string;
};

type WpOrgListRow = {
  name: string;
  slug: string;
  version: string;
  author: string;
  short_description?: string;
};

const AddFromWordPressModal = ({
  show,
  onHide,
  itemKind = 'plugin',
  prefillPluginSlug,
  prefillPluginName,
  initialSearchTerm,
}: AddFromWordPressModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: libraryItems = [] } = useLibraryItems();
  const { data: pluginResults = [], isLoading: pluginsLoading } = useSearchWpPlugins(
    debouncedSearch,
    itemKind === 'plugin',
  );
  const { data: themeResults = [], isLoading: themesLoading } = useSearchWpThemes(
    debouncedSearch,
    itemKind === 'theme',
  );
  const addPluginMutation = useAddOfficialPlugin();
  const addThemeMutation = useAddOfficialTheme();

  const searchLoading = itemKind === 'plugin' ? pluginsLoading : themesLoading;
  const addMutation = itemKind === 'plugin' ? addPluginMutation : addThemeMutation;

  useEffect(() => {
    if (show && initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      setDebouncedSearch(initialSearchTerm.trim());
    } else if (show && !initialSearchTerm) {
      setSearchTerm('');
      setDebouncedSearch('');
    }
  }, [show, initialSearchTerm]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm, show]);

  const isInLibrary = useCallback(
    (slug: string) => {
      const targetSlug = (prefillPluginSlug || slug).toLowerCase();
      return libraryItems.some(
        (i) => i.type === itemKind && (i.wpSlug ?? '').toLowerCase() === targetSlug,
      );
    },
    [libraryItems, prefillPluginSlug, itemKind],
  );

  const handleAdd = (row: WpOrgListRow) => {
    const base = {
      name: row.name,
      slug: row.slug,
      version: row.version,
      author: typeof row.author === 'string' ? row.author : '',
      short_description: row.short_description ?? '',
    };
    if (itemKind === 'plugin') {
      addPluginMutation.mutate(
        {
          ...base,
          ...(prefillPluginSlug && {
            prefillPluginSlug,
            prefillPluginName: prefillPluginName ?? row.name,
          }),
        },
        { onSuccess: () => onHide() },
      );
    } else {
      addThemeMutation.mutate(
        {
          ...base,
          ...(prefillPluginSlug && {
            prefillThemeSlug: prefillPluginSlug,
            prefillThemeName: prefillPluginName ?? row.name,
          }),
        },
        { onSuccess: () => onHide() },
      );
    }
  };

  const rawRows = itemKind === 'plugin' ? pluginResults : themeResults;
  const rows = (rawRows as WpOrgListRow[]).filter((p) => p?.slug);

  const title =
    itemKind === 'theme' ? 'Add theme from WordPress.org' : 'Add from WordPress.org';
  const searchPlaceholder = itemKind === 'theme' ? 'Search themes…' : 'Search plugins…';
  const emptyLabel = itemKind === 'theme' ? 'No themes found.' : 'No plugins found.';

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="app-search mb-3">
          <Form.Control
            type="search"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={searchPlaceholder}
          />
          <LuSearch className="app-search-icon text-muted" />
        </div>
        {searchLoading && debouncedSearch.length > 2 && (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
          </div>
        )}
        {!searchLoading && debouncedSearch.length > 2 && rows.length === 0 && (
          <p className="text-muted text-center py-4 mb-0">{emptyLabel}</p>
        )}
        <ListGroup variant="flush" className="border rounded">
          {rows.map((p) => (
            <ListGroup.Item
              key={p.slug}
              className="d-flex justify-content-between align-items-start gap-2 flex-wrap"
            >
              <div>
                <div className="fw-semibold">{p.name}</div>
                <div className="small text-muted">{p.slug}</div>
                {p.short_description && (
                  <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '28rem' }}>
                    {String(p.short_description).replace(/<[^>]+>/g, '')}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant={isInLibrary(p.slug) ? 'outline-secondary' : 'primary'}
                disabled={addMutation.isPending || isInLibrary(p.slug)}
                onClick={() => handleAdd(p)}
              >
                {isInLibrary(p.slug) ? 'In library' : 'Add'}
              </Button>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Modal.Body>
    </Modal>
  );
};

export default AddFromWordPressModal;
