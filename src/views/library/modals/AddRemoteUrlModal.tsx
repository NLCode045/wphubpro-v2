import { useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useAddRemotePlugin } from '@/hooks/useLibrary';

type AddRemoteUrlModalProps = {
  show: boolean;
  onHide: () => void;
  existingPluginSlug?: string;
  existingPluginName?: string;
  initialPluginName?: string;
};

const AddRemoteUrlModal = ({
  show,
  onHide,
  existingPluginSlug,
  existingPluginName,
  initialPluginName,
}: AddRemoteUrlModalProps) => {
  const [name, setName] = useState('');
  const [wpSlug, setWpSlug] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [author, setAuthor] = useState('');
  const addMutation = useAddRemotePlugin();

  useEffect(() => {
    if (show) {
      const n = existingPluginName ?? initialPluginName ?? '';
      const s =
        existingPluginSlug ??
        (initialPluginName
          ? initialPluginName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          : '');
      setName(n);
      setWpSlug(s);
    }
  }, [show, existingPluginName, existingPluginSlug, initialPluginName]);

  const handleClose = () => {
    setName(existingPluginName ?? '');
    setWpSlug(existingPluginSlug ?? '');
    setVersion('1.0.0');
    setRemoteUrl('');
    setAuthor('');
    onHide();
  };

  const handleSubmit = () => {
    const slug = wpSlug.trim() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug || !remoteUrl.trim()) return;
    addMutation.mutate(
      {
        name: name.trim() || slug,
        wpSlug: slug,
        version: version.trim() || '1.0.0',
        remoteUrl: remoteUrl.trim(),
        author: author.trim(),
      },
      { onSuccess: () => handleClose() },
    );
  };

  const slug = wpSlug.trim() || (name ? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
  const isUrlValid = remoteUrl.trim().startsWith('https://');
  const canSubmit = slug.length > 0 && isUrlValid && !addMutation.isPending;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add from remote URL</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Plugin name</Form.Label>
          <Form.Control
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!!existingPluginName || !!initialPluginName}
            placeholder="e.g. My Custom Plugin"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Plugin slug</Form.Label>
          <Form.Control
            value={wpSlug}
            onChange={(e) => setWpSlug(e.target.value)}
            disabled={!!existingPluginSlug || !!initialPluginName}
            placeholder="e.g. my-custom-plugin"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Version</Form.Label>
          <Form.Control value={version} onChange={(e) => setVersion(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>HTTPS URL to ZIP</Form.Label>
          <Form.Control
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
            placeholder="https://…"
          />
        </Form.Group>
        <Form.Group className="mb-0">
          <Form.Label>Author (optional)</Form.Label>
          <Form.Control value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {addMutation.isPending ? (
            <>
              <Spinner size="sm" className="me-2" />
              Adding…
            </>
          ) : (
            'Add'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddRemoteUrlModal;
