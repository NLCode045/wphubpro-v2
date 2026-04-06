import { useNotificationContext } from '@/context/useNotificationContext';
import {
  useVaultProviderCredentials,
  useVaultProviderDelete,
  useVaultProviderUpsert,
  useVaultProvidersList,
} from '@/domains/admin/useVaultProviders';
import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';

type VaultProvidersTabProps = {
  userId: string;
};

export function VaultProvidersTab({ userId }: VaultProvidersTabProps) {
  const { showNotification } = useNotificationContext();
  const { data: items = [], isLoading, isError, error, refetch } = useVaultProvidersList(userId);
  const upsert = useVaultProviderUpsert(userId);
  const del = useVaultProviderDelete(userId);

  const [modalOpen, setModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [providerIdInput, setProviderIdInput] = useState('');
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('{}');
  const [deleteProvider, setDeleteProvider] = useState<string | null>(null);

  const credsQuery = useVaultProviderCredentials(
    userId,
    editingProvider,
    Boolean(modalOpen && !isNew && editingProvider),
  );

  const lastHydratedProvider = useRef<string | null>(null);

  useEffect(() => {
    if (!modalOpen) lastHydratedProvider.current = null;
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || isNew) return;
    const p = editingProvider;
    if (!p || !credsQuery.isSuccess) return;
    if (lastHydratedProvider.current === p) return;
    lastHydratedProvider.current = p;
    setJsonText(JSON.stringify(credsQuery.data ?? {}, null, 2));
  }, [modalOpen, isNew, editingProvider, credsQuery.isSuccess, credsQuery.data]);

  const notifyError = (err: unknown) => {
    showNotification({
      title: 'Error',
      message: err instanceof Error ? err.message : 'Something went wrong',
      variant: 'danger',
    });
  };

  const openAdd = () => {
    setIsNew(true);
    setEditingProvider(null);
    setProviderIdInput('');
    setJsonText('{\n  \n}');
    setModalOpen(true);
  };

  const openEdit = (provider: string) => {
    setIsNew(false);
    setEditingProvider(provider);
    setProviderIdInput(provider);
    setJsonText('{}');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProvider(null);
  };

  const saveModal = async () => {
    const id = isNew ? providerIdInput.trim() : (editingProvider ?? '').trim();
    if (!id) {
      notifyError(new Error('Provider id is required.'));
      return;
    }
    let credentials: Record<string, unknown>;
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        notifyError(new Error('Credentials must be a JSON object (not an array).'));
        return;
      }
      credentials = parsed as Record<string, unknown>;
    } catch {
      notifyError(new Error('Invalid JSON in credentials.'));
      return;
    }
    try {
      await upsert.mutateAsync({ provider: id, credentials });
      showNotification({
        title: 'Saved',
        message: isNew ? `Provider "${id}" was created.` : `Provider "${id}" was updated.`,
        variant: 'success',
      });
      closeModal();
    } catch (err) {
      notifyError(err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteProvider) return;
    try {
      await del.mutateAsync(deleteProvider);
      showNotification({
        title: 'Deleted',
        message: `Provider "${deleteProvider}" was removed from the vault.`,
        variant: 'success',
      });
      setDeleteProvider(null);
    } catch (err) {
      notifyError(err);
    }
  };

  return (
    <>
      <Row>
        <Col lg={10} xl={9}>
          <Card className="border h-100">
            <Card.Body>
              <Card.Title as="h5">Vault providers</Card.Title>
              <Card.Text className="text-muted small">
                Encrypted connector credentials in the vault database (<code>connectors</code>). Document id equals
                provider id (for example <code>stripe</code>, <code>s3</code>, <code>gemini</code>). Gateways read these
                at runtime; ensure <code>ENCRYPTION_KEY</code> matches on this function and all consumers.
              </Card.Text>

              {isError && (
                <Alert variant="danger" className="small">
                  {error instanceof Error ? error.message : 'Could not load providers.'}{' '}
                  <Button variant="outline-danger" size="sm" className="ms-2" type="button" onClick={() => refetch()}>
                    Retry
                  </Button>
                </Alert>
              )}

              {isLoading && (
                <div className="d-flex align-items-center gap-2 text-muted py-3">
                  <Spinner animation="border" size="sm" role="status" />
                  Loading providers…
                </div>
              )}

              {!isLoading && !isError && (
                <>
                  <div className="mb-3">
                    <Button variant="primary" type="button" onClick={openAdd}>
                      Add provider
                    </Button>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-muted mb-0">No providers in the vault yet.</p>
                  ) : (
                    <div className="table-responsive">
                      <Table hover size="sm" className="align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Provider</th>
                            <th>Payload</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <code>{row.provider}</code>
                              </td>
                              <td>
                                {row.hasPayload ? (
                                  <Badge bg="secondary">encrypted</Badge>
                                ) : (
                                  <Badge bg="warning" text="dark">
                                    empty
                                  </Badge>
                                )}
                              </td>
                              <td className="text-end">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="me-2"
                                  type="button"
                                  onClick={() => openEdit(row.provider)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  type="button"
                                  onClick={() => setDeleteProvider(row.provider)}>
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={modalOpen} onHide={closeModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{isNew ? 'Add vault provider' : 'Edit vault provider'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Provider id</Form.Label>
            <Form.Control
              value={providerIdInput}
              onChange={(e) => setProviderIdInput(e.target.value)}
              disabled={!isNew || upsert.isPending}
              placeholder="stripe"
              autoComplete="off"
            />
            <Form.Text className="text-muted">
              Letters, digits, and <code>.</code> <code>-</code> <code>_</code> only; max 36 characters. Cannot be changed
              after creation.
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-0">
            <Form.Label>Credentials (JSON object)</Form.Label>
            {!isNew && credsQuery.isFetching && (
              <div className="d-flex align-items-center gap-2 text-muted small py-2">
                <Spinner animation="border" size="sm" />
                Loading decrypted credentials…
              </div>
            )}
            {!isNew && credsQuery.isError && (
              <Alert variant="warning" className="small py-2">
                {credsQuery.error instanceof Error ? credsQuery.error.message : 'Could not load credentials.'}
              </Alert>
            )}
            <Form.Control
              as="textarea"
              rows={14}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="font-monospace small"
              disabled={upsert.isPending || (!isNew && credsQuery.isFetching)}
              spellCheck={false}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" type="button" onClick={closeModal} disabled={upsert.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={
              upsert.isPending || (!isNew && (credsQuery.isFetching || credsQuery.isError)) || (!isNew && !credsQuery.isSuccess)
            }
            onClick={() => void saveModal()}>
            {upsert.isPending ? 'Saving…' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={deleteProvider !== null} onHide={() => setDeleteProvider(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete provider</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Remove <code>{deleteProvider}</code> from the vault? Gateways will no longer find credentials for this
          provider.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" type="button" onClick={() => setDeleteProvider(null)} disabled={del.isPending}>
            Cancel
          </Button>
          <Button variant="danger" type="button" disabled={del.isPending} onClick={() => void confirmDelete()}>
            {del.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
