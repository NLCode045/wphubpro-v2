import { ROUTE_PATHS } from '@/config/routePaths';
import { libraryCategoriesForLibraryItemRow } from '@/domains/library';
import { usePatchLibraryItem } from '@/hooks/useLibrary';
import {
  useCreateLibraryCollection,
  useCreateLibraryFamily,
  useUpdateLibraryCollectionItems,
  useUpdateLibraryFamilyMemberSlugs,
} from '@/hooks/useLibraryFamiliesAndCollections';
import { useNotificationContext } from '@/context/useNotificationContext';
import type { LibraryCategory, LibraryCollection, LibraryFamily, LibraryItemType } from '@/types';
import LibraryCategoryGroupedSelect from '@/views/library/components/LibraryCategoryGroupedSelect';
import { useMemo, useState } from 'react';
import { Alert, Button, Form, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router';
import { TbFolderPlus, TbPlus, TbUsersPlus, TbX } from 'react-icons/tb';

type LibraryItemDetailOrganizationProps = {
  itemKind: 'plugin' | 'theme';
  slug: string;
  displayName: string;
  libraryDocumentId: string;
  categoryId?: string;
  tags: string[];
  categories: LibraryCategory[];
  collections: LibraryFamily extends infer _ ? LibraryCollection[] : never;
  families: LibraryFamily[];
  duplicateLibraryDocuments: boolean;
};

function mergeUniqueTag(existing: string[], next: string): string[] {
  const t = next.trim();
  if (!t) return existing;
  const lower = new Set(existing.map((x) => x.toLowerCase()));
  if (lower.has(t.toLowerCase())) return existing;
  return [...existing, t];
}

const LibraryItemDetailOrganization = ({
  itemKind,
  slug,
  displayName,
  libraryDocumentId,
  categoryId,
  tags,
  categories,
  collections,
  families,
  duplicateLibraryDocuments,
}: LibraryItemDetailOrganizationProps) => {
  const { showNotification } = useNotificationContext();
  const patchMutation = usePatchLibraryItem();
  const updateFamilySlugs = useUpdateLibraryFamilyMemberSlugs();
  const createFamily = useCreateLibraryFamily();
  const updateCollectionItems = useUpdateLibraryCollectionItems();
  const createCollection = useCreateLibraryCollection();

  const [tagInput, setTagInput] = useState('');
  const [collectionPickId, setCollectionPickId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [familyPickId, setFamilyPickId] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');

  const categoriesForRow = useMemo(
    () => libraryCategoriesForLibraryItemRow({ kind: itemKind, categoryId }, categories),
    [itemKind, categoryId, categories],
  );

  const collectionsWithItem = useMemo(
    () =>
      collections.filter((c) =>
        c.items.some((m) => m.slug === slug && m.type === itemKind),
      ),
    [collections, slug, itemKind],
  );

  const collectionsWithoutItem = useMemo(
    () =>
      collections.filter(
        (c) => !c.items.some((m) => m.slug === slug && m.type === itemKind),
      ),
    [collections, slug, itemKind],
  );

  const familiesWithSlug = useMemo(
    () => families.filter((f) => f.memberSlugs.some((s) => s.toLowerCase() === slug)),
    [families, slug],
  );

  const familiesWithoutSlug = useMemo(
    () => families.filter((f) => !f.memberSlugs.some((s) => s.toLowerCase() === slug)),
    [families, slug],
  );

  const busy =
    patchMutation.isPending ||
    updateFamilySlugs.isPending ||
    createFamily.isPending ||
    updateCollectionItems.isPending ||
    createCollection.isPending;

  const memberPayload = useMemo(
    () => ({ slug, type: itemKind, versionMode: 'default' as const }),
    [slug, itemKind],
  );

  const handleCategoryChange = (next: string | null) => {
    patchMutation.mutate({
      itemId: libraryDocumentId,
      categoryId: next,
    });
  };

  const handleAddTag = () => {
    const nextTags = mergeUniqueTag(tags, tagInput);
    if (nextTags.length === tags.length) {
      showNotification({
        title: 'Tag',
        message: tagInput.trim() ? `“${tagInput.trim()}” is already on this item.` : 'Enter a tag.',
        variant: 'warning',
      });
      return;
    }
    patchMutation.mutate(
      { itemId: libraryDocumentId, tags: nextTags },
      {
        onSuccess: () => {
          setTagInput('');
          showNotification({ title: 'Tags', message: 'Tag saved.', variant: 'success' });
        },
      },
    );
  };

  const handleRemoveTag = (t: string) => {
    patchMutation.mutate({
      itemId: libraryDocumentId,
      tags: tags.filter((x) => x !== t),
    });
  };

  const handleAddToCollection = () => {
    const c = collections.find((x) => x.$id === collectionPickId);
    if (!c) return;
    const next = [...c.items, memberPayload];
    updateCollectionItems.mutate(
      { collectionId: c.$id, items: next },
      {
        onSuccess: () => {
          setCollectionPickId('');
          showNotification({ title: 'Collection', message: `Added to “${c.name}”.`, variant: 'success' });
        },
      },
    );
  };

  const handleRemoveFromCollection = (collectionId: string) => {
    const c = collections.find((x) => x.$id === collectionId);
    if (!c) return;
    const next = c.items.filter((m) => !(m.slug === slug && m.type === itemKind));
    updateCollectionItems.mutate({ collectionId: c.$id, items: next });
  };

  const handleCreateCollection = () => {
    const name = newCollectionName.trim() || `${displayName} bundle`;
    createCollection.mutate(
      { name, items: [memberPayload] },
      {
        onSuccess: () => setNewCollectionName(''),
      },
    );
  };

  const handleAddToFamily = () => {
    const f = families.find((x) => x.$id === familyPickId);
    if (!f) return;
    const next = [...f.memberSlugs.map((s) => s.toLowerCase()), slug.toLowerCase()];
    updateFamilySlugs.mutate(
      { familyId: f.$id, memberSlugs: next },
      {
        onSuccess: () => {
          setFamilyPickId('');
          showNotification({
            title: 'Family',
            message: `Added to “${f.name?.trim() || 'family'}”.`,
            variant: 'success',
          });
        },
      },
    );
  };

  const handleRemoveFromFamily = (familyId: string) => {
    const f = families.find((x) => x.$id === familyId);
    if (!f) return;
    const next = f.memberSlugs.filter((s) => s.toLowerCase() !== slug);
    updateFamilySlugs.mutate({ familyId: f.$id, memberSlugs: next });
  };

  const handleCreateFamily = () => {
    createFamily.mutate(
      {
        name: newFamilyName.trim() || displayName,
        memberSlugs: [slug],
      },
      {
        onSuccess: () => setNewFamilyName(''),
      },
    );
  };

  return (
    <div className="border rounded p-3 bg-light bg-opacity-50">
      <h6 className="text-muted text-uppercase fs-xs fw-semibold mb-3">Organization</h6>

      {duplicateLibraryDocuments ? (
        <Alert variant="warning" className="py-2 small mb-3 mb-0">
          Multiple library documents share this slug. Category and tags apply to the first document only.
        </Alert>
      ) : null}

      <div className="mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <span className="fw-semibold fs-sm">Category</span>
          <Link to={ROUTE_PATHS.LIBRARY} className="fs-xs text-decoration-none">
            Manage categories
          </Link>
        </div>
        <p className="text-muted fs-xs mb-2">
          One folder category per item. Use tags below for extra labels, and collections for install bundles.
        </p>
        <LibraryCategoryGroupedSelect
          categories={categoriesForRow}
          value={categoryId}
          onChange={handleCategoryChange}
          disabled={busy || !libraryDocumentId}
          aria-label="Library category"
          noneOptionLabel="No category"
          noneGroupLabel="Uncategorized"
          size="sm"
          className="w-100"
          minWidth="100%"
        />
      </div>

      <div className="mb-4">
        <span className="fw-semibold fs-sm d-block mb-2">Tags</span>
        <div className="d-flex flex-wrap gap-1 mb-2">
          {tags.length === 0 ? (
            <span className="text-muted fs-xs">No tags yet.</span>
          ) : (
            tags.map((t) => (
              <span
                key={t}
                className="badge badge-soft-secondary fs-xxs d-inline-flex align-items-center gap-1 py-1"
              >
                {t}
                <button
                  type="button"
                  className="btn btn-link p-0 lh-1 text-secondary"
                  aria-label={`Remove tag ${t}`}
                  disabled={busy}
                  onClick={() => handleRemoveTag(t)}
                >
                  <TbX size={14} />
                </button>
              </span>
            ))
          )}
        </div>
        <InputGroup size="sm">
          <Form.Control
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tag…"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button variant="primary" disabled={busy || !tagInput.trim()} onClick={handleAddTag}>
            <TbPlus className="me-1" />
            Add
          </Button>
        </InputGroup>
      </div>

      <div className="mb-4">
        <span className="fw-semibold fs-sm d-block mb-2">Collections</span>
        <p className="text-muted fs-xs mb-2">Batch-install bundles that include this {itemKind}.</p>
        {collectionsWithItem.length > 0 ? (
          <ul className="list-unstyled small mb-3">
            {collectionsWithItem.map((c) => (
              <li key={c.$id} className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-1 border-bottom border-light">
                <Link to={`${ROUTE_PATHS.LIBRARY}?view=collections`} className="text-decoration-none">
                  {c.name}
                </Link>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleRemoveFromCollection(c.$id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fs-xs mb-3">Not in any collection yet.</p>
        )}
        <div className="d-flex flex-column gap-2">
          <div className="d-flex flex-wrap gap-2 align-items-stretch">
            <Form.Select
              size="sm"
              className="flex-grow-1"
              style={{ minWidth: '10rem' }}
              value={collectionPickId}
              onChange={(e) => setCollectionPickId(e.target.value)}
              disabled={busy || collectionsWithoutItem.length === 0}
              aria-label="Add to collection"
            >
              <option value="">Add to existing…</option>
              {collectionsWithoutItem.map((c) => (
                <option key={c.$id} value={c.$id}>
                  {c.name}
                </option>
              ))}
            </Form.Select>
            <Button
              variant="outline-primary"
              size="sm"
              disabled={busy || !collectionPickId}
              onClick={handleAddToCollection}
            >
              <TbFolderPlus className="me-1" />
              Add
            </Button>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-stretch">
            <Form.Control
              size="sm"
              className="flex-grow-1"
              style={{ minWidth: '10rem' }}
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder={`New collection (default: “${displayName} bundle”)`}
              disabled={busy}
            />
            <Button variant="primary" size="sm" disabled={busy} onClick={handleCreateCollection}>
              Create with this item
            </Button>
          </div>
        </div>
      </div>

      <div>
        <span className="fw-semibold fs-sm d-block mb-2">Families</span>
        <p className="text-muted fs-xs mb-2">
          Group related plugins/themes for linked installs. Members are matched by slug.
        </p>
        {familiesWithSlug.length > 0 ? (
          <ul className="list-unstyled small mb-3">
            {familiesWithSlug.map((f) => (
              <li key={f.$id} className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-1 border-bottom border-light">
                <Link to={`${ROUTE_PATHS.LIBRARY}?view=families`} className="text-decoration-none">
                  {f.name?.trim() || f.memberSlugs.join(', ') || 'Untitled family'}
                </Link>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleRemoveFromFamily(f.$id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fs-xs mb-3">Not in any family yet.</p>
        )}
        <div className="d-flex flex-column gap-2">
          <div className="d-flex flex-wrap gap-2 align-items-stretch">
            <Form.Select
              size="sm"
              className="flex-grow-1"
              style={{ minWidth: '10rem' }}
              value={familyPickId}
              onChange={(e) => setFamilyPickId(e.target.value)}
              disabled={busy || familiesWithoutSlug.length === 0}
              aria-label="Add to family"
            >
              <option value="">Add to existing…</option>
              {familiesWithoutSlug.map((f) => (
                <option key={f.$id} value={f.$id}>
                  {f.name?.trim() || f.memberSlugs.join(', ') || 'Untitled family'}
                </option>
              ))}
            </Form.Select>
            <Button
              variant="outline-primary"
              size="sm"
              disabled={busy || !familyPickId}
              onClick={handleAddToFamily}
            >
              <TbUsersPlus className="me-1" />
              Add
            </Button>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-stretch">
            <Form.Control
              size="sm"
              className="flex-grow-1"
              style={{ minWidth: '10rem' }}
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              placeholder={`New family name (optional, default: “${displayName}”)`}
              disabled={busy}
            />
            <Button variant="primary" size="sm" disabled={busy} onClick={handleCreateFamily}>
              New family from this item
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryItemDetailOrganization;
