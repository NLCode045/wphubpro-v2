import { useEffect, useRef, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useUploadLocalItem } from '@/hooks/useLibrary';

type UploadLibraryModalProps = {
  show: boolean;
  onHide: () => void;
  initialType?: 'plugin' | 'theme';
  prefillPluginSlug?: string;
};

const UploadLibraryModal = ({ show, onHide, initialType, prefillPluginSlug }: UploadLibraryModalProps) => {
  const [type, setType] = useState<'plugin' | 'theme'>(initialType ?? 'plugin');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadLocalItem();

  useEffect(() => {
    if (show && initialType) setType(initialType);
  }, [show, initialType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.name.endsWith('.zip') || f.name.endsWith('.ZIP'))) {
      setFile(f);
    } else {
      setFile(null);
    }
  };

  const handleClose = () => {
    setFile(null);
    setType('plugin');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onHide();
  };

  const handleSubmit = () => {
    if (!file) return;
    uploadMutation.mutate(
      { file, type, ...(prefillPluginSlug && { wpSlug: prefillPluginSlug }) },
      {
        onSuccess: (data) => {
          if (data.success) handleClose();
        },
      },
    );
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Upload ZIP</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Type</Form.Label>
          <Form.Select
            value={type}
            onChange={(e) => setType(e.target.value as 'plugin' | 'theme')}
            disabled={!!initialType}
          >
            <option value="plugin">Plugin</option>
            <option value="theme">Theme</option>
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label>ZIP file</Form.Label>
          <Form.Control ref={fileInputRef} type="file" accept=".zip,.ZIP" onChange={handleFileChange} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!file || uploadMutation.isPending} onClick={handleSubmit}>
          {uploadMutation.isPending ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Uploading…
            </>
          ) : (
            'Upload'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UploadLibraryModal;
