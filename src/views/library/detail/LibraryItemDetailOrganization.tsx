import { ROUTE_PATHS } from '@/config/routePaths';
import { buildCategoryPathById, libraryCategoriesForLibraryItemRowMulti } from '@/domains/library';
import { usePatchLibraryItem } from '@/hooks/useLibrary';
import {
  useCreateLibraryCollection,
  useCreateLibraryFamily,
  useUpdateLibraryCollectionItems,
  useUpdateLibraryFamilyMemberSlugs,
} from '@/hooks/useLibraryFamiliesAndCollections';
import { useNotificationContext } from '@/context/useNotificationContext';
import type { LibraryCategory, LibraryCollection, LibraryFamily, LibraryItemType } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import { Link } from 'react-router';
import { TbPencil, TbPlus, TbX } from 'react-icons/tb';

type LibraryItemDetailOrganizationProps = {
  itemKind: 'plugin' | 'theme';
  slug: string;
  displayName: string;
  libraryDocumentId: string;
  categoryIds: string[];
  tags: string[];
  categories: LibraryCategory[];
  collections: LibraryCollection[];
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
  categoryIds,
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

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagModalInput, setTagModalInput] = useState('');

  const [collectionPickId, setCollectionPickId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [familyPickId, setFamilyPickId] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  useEffect(() => {
    if (categoryModalOpen) setDraftCategoryIds([...categoryIds]);
  }, [categoryModalOpen, categoryIds]);

  useEffect(() => {
    if (tagsModalOpen) {
      setDraftTags([...tags]);
      setTagModalInput('');
    }
  }, [tagsModalOpen, tags]);

  const pathById = useMemo(() => buildCategoryPathById(categories), [categories]);

  const categoriesSelectable = useMemo(
    () => libraryCategoriesForLibraryItemRowMulti({ kind: itemKind, categoryIds }, categories),
    [itemKind, categoryIds, categories],
  );

  const categorySummary = useMemo(() => {
    if (categoryIds.length === 0) return null;
    return categoryIds.map((id) => pathById[id] || id).join(', ');
  }, [categoryIds, pathById]);

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

  const memberPayload = useMemo(() => {
    const type: LibraryItemType = itemKind;
    return { slug, type, versionMode: 'default' as const };
  }, [slug, itemKind]);

  const toggleDraftCategory = (id: string) => {
    setDraftCategoryIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s);
    });
  };

  const saveCategories = () => {
    patchMutation.mutate(
      { itemId: libraryDocumentId, categoryIds: draftCategoryIds },
      {
        onSuccess: () => setCategoryModalOpen(false),
      },
    );
  };

  const addDraftTag = () => {
    const next = mergeUniqueTag(draftTags, tagModalInput);
    if (next.length === draftTags.length) {
      showNotification({
        title: 'Tag',
        message: tagModalInput.trim() ? `“${tagModalInput.trim()}” is already in the list.` : 'Enter a tag.',
        variant: 'warning',
      });
      return;
    }
    setDraftTags(next);
    setTagModalInput('');
  };

  const saveTags = () => {
    patchMutation.mutate(
      { itemId: libraryDocumentId, tags: draftTags },
      {
        onSuccess: () => setTagsModalOpen(false),
      },
    );
  };

  const resetFamilyModal = () => {
    setFamilyPickId('');
    setNewFamilyName('');
  };

  const resetCollectionModal = () => {
    setCollectionPickId('');
    setNewCollectionName('');
  };

  const handleAddToCollection = () => {
    const c = collections.find((x) => x.$id === collectionPickId);
    if (!c) return;
    const next = [...c.items, memberPayload];
    updateCollectionItems.mutate(
      { collectionId: c.$id, items: next },
      {
        onSuccess: () => {
          resetCollectionModal();
          setCollectionModalOpen(false);
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
        onSuccess: () => {
          resetCollectionModal();
          setCollectionModalOpen(false);
        },
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
          resetFamilyModal();
          setFamilyModalOpen(false);
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
        onSuccess: () => {
          resetFamilyModal();
          setFamilyModalOpen(false);
        },
      },
    );
  };

  return (
    <div className="border rounded p-3 bg-light bg-opacity-50">
      <h6 className="text-muted text-uppercase fs-xs fw-semibold mb-3">Organization</h6>

      {duplicateLibraryDocuments ? (
        <Alert variant="warning" className="py-2 small mb-3">
          Multiple library documents share this slug. Category and tags apply to the first document only.
        </Alert>
      ) : null}

      <Row className="g-4 align-items-start mb-4">
        <Col xs={12} md={6}>
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <span className="fw-semibold fs-sm">Categories</span>
            <Button
              variant="outline-primary"
              size="sm"
              className="d-inline-flex align-items-center justify-content-center rounded-circle p-0"
              style={{ width: '2rem', height: '2rem' }}
              disabled={busy || !libraryDocumentId}
              onClick={() => setCategoryModalOpen(true)}
              aria-label="Edit categories"
              title="Edit categories"
            >
              <TbPencil className="fs-5" />
            </Button>
          </div>
          <p className="text-muted fs-xs mb-2">
            One or more folder categories.{' '}
            <Link to={ROUTE_PATHS.LIBRARY} className="text-decoration-none">
              Manage categories
            </Link>
          </p>
          <p className="text-muted fs-sm mb-0">{categorySummary ?? 'No categories yet.'}</p>
        </Col>
        <Col xs={12} md={6}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <span className="fw-semibold fs-sm">Tags</span>
            <Button
              variant="outline-primary"
              size="sm"
              className="d-inline-flex align-items-center justify-content-center rounded-circle p-0"
              style={{ width: '2rem', height: '2rem' }}
              disabled={busy || !libraryDocumentId}
              onClick={() => setTagsModalOpen(true)}
              aria-label="Edit tags"
              title="Edit tags"
            >
              <TbPencil className="fs-5" />
            </Button>
          </div>
          <div className="d-flex flex-wrap gap-1">
            {tags.length === 0 ? (
              <span className="text-muted fs-xs">No tags yet.</span>
            ) : (
              tags.map((t) => (
                <span key={t} className="badge badge-soft-secondary fs-xxs py-1">
                  {t}
                </span>
              ))
            )}
          </div>
        </Col>
      </Row>

      <Row className="g-4 align-items-start">
        <Col xs={12} md={6}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <span className="fw-semibold fs-sm">Families</span>
            <Button
              variant="outline-primary"
              size="sm"
              className="d-inline-flex align-items-center justify-content-center rounded-circle p-0"
              style={{ width: '2rem', height: '2rem' }}
              disabled={busy}
              onClick={() => setFamilyModalOpen(true)}
              aria-label="Edit families"
              title="Edit families"
            >
              <TbPencil className="fs-5" />
            </Button>
          </div>
          <p className="text-muted fs-xs mb-2">
            Group related plugins/themes for linked installs. Members are matched by slug.
          </p>
          {familiesWithSlug.length > 0 ? (
            <ul className="list-unstyled small mb-0">
              {familiesWithSlug.map((f) => (
                <li
                  key={f.$id}
                  className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-1 border-bottom border-light"
                >
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
            <p className="text-muted fs-xs mb-0">Not in any family yet.</p>
          )}
        </Col>
        <Col xs={12} md={6}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <span className="fw-semibold fs-sm">Collections</span>
            <Button
              variant="outline-primary"
              size="sm"
              className="d-inline-flex align-items-center justify-content-center rounded-circle p-0"
              style={{ width: '2rem', height: '2rem' }}
              disabled={busy}
              onClick={() => setCollectionModalOpen(true)}
              aria-label="Edit collections"
              title="Edit collections"
            >
              <TbPencil className="fs-5" />
            </Button>
          </div>
          <p className="text-muted fs-xs mb-2">Batch-install bundles that include this {itemKind}.</p>
          {collectionsWithItem.length > 0 ? (
            <ul className="list-unstyled small mb-0">
              {collectionsWithItem.map((c) => (
                <li
                  key={c.$id}
                  className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-1 border-bottom border-light"
                >
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
            <p className="text-muted fs-xs mb-0">Not in any collection yet.</p>
          )}
        </Col>
      </Row>

      <Modal
        show={categoryModalOpen}
        onHide={() => setCategoryModalOpen(false)}
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title as="h5">Categories</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">Select one or more categories for this item.</p>
          <div className="d-flex flex-column gap-2" style={{ maxHeight: 'min(50vh, 320px)' }}>
            {categoriesSelectable.map((c) => (
              <Form.Check
                key={c.$id}
                id={`lib-detail-cat-${c.$id}`}
                type="checkbox"
                label={pathById[c.$id] || c.name}
                checked={draftCategoryIds.includes(c.$id)}
                onChange={() => toggleDraftCategory(c.$id)}
                disabled={busy}
              />
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setCategoryModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={busy} onClick={saveCategories}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={tagsModalOpen} onHide={() => setTagsModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Tags</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">Add or remove tags for this library item.</p>
          <div className="d-flex flex-wrap gap-1 mb-3">
            {draftTags.length === 0 ? (
              <span className="text-muted fs-xs">No tags yet.</span>
            ) : (
              draftTags.map((t) => (
                <span
                  key={t}
                  className="badge badge-soft-secondary fs-xxs d-inline-flex align-items-center gap-1 py-1"
                >
                  {t}
                  <button
                    type="button"
                    className="btn btn-link p-0 lh-1 text-secondary"
                    aria-label={`Remove ${t}`}
                    disabled={busy}
                    onClick={() => setDraftTags((d) => d.filter((x) => x !== t))}
                  >
                    <TbX size={14} />
                  </button>
                </span>
              ))
            )}
          </div>
          <InputGroup size="sm">
            <Form.Control
              value={tagModalInput}
              onChange={(e) => setTagModalInput(e.target.value)}
              placeholder="Add tag…"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDraftTag();
                }
              }}
            />
            <Button variant="primary" disabled={busy || !tagModalInput.trim()} onClick={addDraftTag}>
              <TbPlus className="me-1" />
              Add
            </Button>
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setTagsModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={busy} onClick={saveTags}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={familyModalOpen}
        onHide={() => {
          setFamilyModalOpen(false);
          resetFamilyModal();
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title as="h5">Families</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">
            Add this {itemKind} to an existing family, or create a new family that starts with it.
          </p>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Add to existing</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              <Form.Select
                size="sm"
                className="flex-grow-1"
                value={familyPickId}
                onChange={(e) => setFamilyPickId(e.target.value)}
                disabled={busy || familiesWithoutSlug.length === 0}
                aria-label="Choose family"
              >
                <option value="">Choose family…</option>
                {familiesWithoutSlug.map((f) => (
                  <option key={f.$id} value={f.$id}>
                    {f.name?.trim() || f.memberSlugs.join(', ') || 'Untitled family'}
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !familyPickId}
                onClick={handleAddToFamily}
              >
                Add
              </Button>
            </div>
            {familiesWithoutSlug.length === 0 ? (
              <Form.Text className="text-muted">All families already include this slug.</Form.Text>
            ) : null}
          </Form.Group>
          <Form.Group className="mb-0">
            <Form.Label className="small fw-semibold">Create new family</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              <Form.Control
                size="sm"
                className="flex-grow-1"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                placeholder={`Name (optional, default: “${displayName}”)`}
                disabled={busy}
              />
              <Button variant="outline-primary" size="sm" disabled={busy} onClick={handleCreateFamily}>
                Create
              </Button>
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light"
            size="sm"
            onClick={() => {
              setFamilyModalOpen(false);
              resetFamilyModal();
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={collectionModalOpen}
        onHide={() => {
          setCollectionModalOpen(false);
          resetCollectionModal();
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title as="h5">Collections</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">
            Add this {itemKind} to a collection for batch install, or create a new collection.
          </p>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Add to existing</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              <Form.Select
                size="sm"
                className="flex-grow-1"
                value={collectionPickId}
                onChange={(e) => setCollectionPickId(e.target.value)}
                disabled={busy || collectionsWithoutItem.length === 0}
                aria-label="Choose collection"
              >
                <option value="">Choose collection…</option>
                {collectionsWithoutItem.map((c) => (
                  <option key={c.$id} value={c.$id}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !collectionPickId}
                onClick={handleAddToCollection}
              >
                Add
              </Button>
            </div>
            {collectionsWithoutItem.length === 0 ? (
              <Form.Text className="text-muted">All collections already include this item.</Form.Text>
            ) : null}
          </Form.Group>
          <Form.Group className="mb-0">
            <Form.Label className="small fw-semibold">Create new collection</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              <Form.Control
                size="sm"
                className="flex-grow-1"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder={`Name (optional, default: “${displayName} bundle”)`}
                disabled={busy}
              />
              <Button variant="outline-primary" size="sm" disabled={busy} onClick={handleCreateCollection}>
                Create
              </Button>
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light"
            size="sm"
            onClick={() => {
              setCollectionModalOpen(false);
              resetCollectionModal();
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LibraryItemDetailOrganization;
