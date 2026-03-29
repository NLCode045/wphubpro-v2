import { useDeleteLibraryCategory, useUpdateLibraryCategory } from '@/hooks/useLibraryCategories';
import type { LibraryCategory, LibraryCategoryScope } from '@/types';
import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';

type EditCategoryModalProps = {
  show: boolean;
  onHide: () => void;
  category: LibraryCategory | null;
};

const EditCategoryModal = ({ show, onHide, category }: EditCategoryModalProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [scope, setScope] = useState<LibraryCategoryScope>('general');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const updateMutation = useUpdateLibraryCategory();
  const deleteMutation = useDeleteLibraryCategory();

  useEffect(() => {
    if (!show || !category) return;
    setName(category.name);
    setColor(category.color ?? '');
    setScope(category.scope);
    setDeleteConfirm(false);
  }, [show, category]);

  const handleSubmit = () => {
    if (!category) return;
    const n = name.trim();
    if (!n) return;
    updateMutation.mutate(
      {
        categoryId: category.$id,
        name: n,
        scope,
        color: color.trim() || null,
      },
      {
        onSuccess: () => onHide(),
      },
    );
  };

  const handleDelete = () => {
    if (!category || deleteMutation.isPending) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    deleteMutation.mutate(category.$id, {
      onSuccess: () => {
        setDeleteConfirm(false);
        onHide();
      },
    });
  };

  const busy = updateMutation.isPending || deleteMutation.isPending;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit category</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {category && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Show in</Form.Label>
              <Form.Select
                value={scope}
                onChange={(e) => setScope(e.target.value as LibraryCategoryScope)}
                aria-label="Category visibility"
              >
                <option value="general">All item views (plugins & themes)</option>
                <option value="plugin">Plugins view only</option>
                <option value="theme">Themes view only</option>
              </Form.Select>
              <Form.Text className="text-muted">
                General categories appear in every items grid; plugin/theme categories only when that table is active.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label>Color (optional)</Form.Label>
              <Form.Select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="">Default</option>
                <option value="primary">Primary</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="danger">Danger</option>
                <option value="purple">Purple</option>
              </Form.Select>
            </Form.Group>
            {deleteConfirm ? (
              <Alert variant="danger" className="mt-3 mb-0">
                <p className="mb-2 small">
                  Delete <strong>{name.trim() || category.name}</strong>? Library items in this category will no longer be
                  assigned to it.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <Button variant="danger" size="sm" disabled={deleteMutation.isPending} onClick={handleDelete}>
                    {deleteMutation.isPending ? <Spinner size="sm" /> : 'Delete permanently'}
                  </Button>
                  <Button
                    variant="light"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Cancel delete
                  </Button>
                </div>
              </Alert>
            ) : null}
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="justify-content-between">
        <Button variant="outline-danger" disabled={!category || busy} onClick={handleDelete}>
          {deleteConfirm ? 'Confirm delete…' : 'Delete category'}
        </Button>
        <div className="d-flex gap-2">
          <Button variant="light" onClick={onHide} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!category || !name.trim() || busy} onClick={handleSubmit}>
            {updateMutation.isPending ? <Spinner size="sm" /> : 'Save'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default EditCategoryModal;
