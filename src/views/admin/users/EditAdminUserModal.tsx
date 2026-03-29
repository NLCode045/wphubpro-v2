import type { AdminUser } from '@/domains/admin/useAdminUsers';
import { useAdminUsersUpdate } from '@/domains/admin/useAdminUsers';
import { useNotificationContext } from '@/context/useNotificationContext';
import { useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';

type EditAdminUserModalProps = {
  user: AdminUser | null;
  show: boolean;
  onHide: () => void;
  onSaved: () => void;
};

const EditAdminUserModal = ({ user, show, onHide, onSaved }: EditAdminUserModalProps) => {
  const { showNotification } = useNotificationContext();
  const updateMutation = useAdminUsersUpdate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setStatus(user.status);
      setIsAdmin(user.isAdmin);
    }
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    updateMutation.mutate(
      {
        userId: user.id,
        updates: {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          status,
          isAdmin,
        },
      },
      {
        onSuccess: () => {
          showNotification({ title: 'User updated', message: `${name || user.name} saved.`, variant: 'success' });
          onSaved();
          onHide();
        },
        onError: (err: Error) => {
          showNotification({
            title: 'Error',
            message: err.message || 'Could not update user',
            variant: 'danger',
          });
        },
      },
    );
  };

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h5">Edit user</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>E-mail</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Status</Form.Label>
          <Form.Select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
            aria-label="Account status"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Form.Select>
        </Form.Group>
        <Form.Check
          type="checkbox"
          id="edit-user-admin"
          label="Admin"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" type="button" onClick={onHide} disabled={updateMutation.isPending}>
          Cancel
        </Button>
        <Button variant="primary" type="button" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Saving…
            </>
          ) : (
            'Save'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditAdminUserModal;
