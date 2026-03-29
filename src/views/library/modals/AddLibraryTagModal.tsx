import type { LibraryDashboardRow } from '@/domains/library';
import { usePatchLibraryItem } from '@/hooks/useLibrary';
import { useNotificationContext } from '@/context/useNotificationContext';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';

type AddLibraryTagModalProps = {
  show: boolean;
  onHide: () => void;
  rows: LibraryDashboardRow[];
};

function mergeUniqueTags(existing: string[], next: string): string[] {
  const t = next.trim();
  if (!t) return existing;
  const lower = new Set(existing.map((x) => x.toLowerCase()));
  if (lower.has(t.toLowerCase())) return existing;
  return [...existing, t];
}

const AddLibraryTagModal = ({ show, onHide, rows }: AddLibraryTagModalProps) => {
  const { showNotification } = useNotificationContext();
  const patchMutation = usePatchLibraryItem();
  const [tagText, setTagText] = useState('');
  const [itemId, setItemId] = useState('');

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

  useEffect(() => {
    if (!show) return;
    setTagText('');
    setItemId(sortedRows[0]?.libraryDocumentId ?? '');
  }, [show, sortedRows]);

  const selectedRow = useMemo(
    () => sortedRows.find((r) => r.libraryDocumentId === itemId),
    [sortedRows, itemId],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = tagText.trim();
    if (!trimmed || !itemId || !selectedRow) return;
    const nextTags = mergeUniqueTags(selectedRow.tags, trimmed);
    if (nextTags.length === selectedRow.tags.length) {
      showNotification({
        title: 'Tag already present',
        message: `“${trimmed}” is already on this item.`,
        variant: 'warning',
      });
      return;
    }
    patchMutation.mutate(
      { itemId, tags: nextTags },
      {
        onSuccess: () => {
          showNotification({
            title: 'Tag added',
            message: `“${trimmed}” was added to ${selectedRow.name}.`,
            variant: 'success',
          });
          onHide();
        },
      },
    );
  };

  const disabled = !tagText.trim() || !itemId || patchMutation.isPending;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h5">Add tag</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <p className="text-muted small mb-3">
            Choose a library item and enter a new tag. It appears in the sidebar once saved.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Item</Form.Label>
            <Form.Select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              disabled={sortedRows.length === 0 || patchMutation.isPending}
              aria-label="Library item"
            >
              {sortedRows.length === 0 ? (
                <option value="">No items in library</option>
              ) : (
                sortedRows.map((r) => (
                  <option key={r.libraryDocumentId} value={r.libraryDocumentId}>
                    {r.name} ({r.kind === 'plugin' ? 'Plugin' : 'Theme'})
                  </option>
                ))
              )}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-0">
            <Form.Label>Tag</Form.Label>
            <Form.Control
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="e.g. client-sites"
              autoFocus
              disabled={patchMutation.isPending}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" type="button" onClick={onHide} disabled={patchMutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={disabled}>
            {patchMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddLibraryTagModal;
