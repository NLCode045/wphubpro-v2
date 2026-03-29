import { useCreateLibraryCategory } from '@/hooks/useLibraryCategories';
import type { LibraryCategoryScope } from '@/types';
import { useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';

type CreateCategoryModalProps = {
  show: boolean;
  onHide: () => void;
};

const CreateCategoryModal = ({ show, onHide }: CreateCategoryModalProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [scope, setScope] = useState<LibraryCategoryScope>('general');
  const createMutation = useCreateLibraryCategory();

  useEffect(() => {
    if (!show) return;
    setName('');
    setColor('');
    setScope('general');
  }, [show]);

  const handleSubmit = () => {
    const n = name.trim();
    if (!n) return;
    createMutation.mutate(
      { name: n, scope, ...(color.trim() ? { color: color.trim() } : {}) },
      {
        onSuccess: () => {
          setName('');
          setColor('');
          setScope('general');
          onHide();
        },
      },
    );
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>New category</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Client work" />
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
        <Form.Group>
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
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!name.trim() || createMutation.isPending} onClick={handleSubmit}>
          {createMutation.isPending ? <Spinner size="sm" /> : 'Create'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateCategoryModal;
