import { useEffect, useState } from 'react';
import { Button, ListGroup, Modal } from 'react-bootstrap';
import { TbCloudDownload, TbLink, TbUpload } from 'react-icons/tb';
import type { AddLibrarySourcePayload, LibrarySourceKind } from './addLibraryTypes';

type Step = 'source' | 'prefill_name' | 'prefill_pick';

type AddLibrarySourceModalProps = {
  show: boolean;
  onHide: () => void;
  isPluginsView: boolean;
  onChooseSource: (payload: AddLibrarySourcePayload) => void;
  disabled?: boolean;
  existingPluginSlug?: string;
  existingPluginName?: string;
};

const AddLibrarySourceModal = ({
  show,
  onHide,
  isPluginsView,
  onChooseSource,
  disabled,
  existingPluginSlug,
  existingPluginName,
}: AddLibrarySourceModalProps) => {
  const [step, setStep] = useState<Step>('source');
  const [pluginName, setPluginName] = useState('');

  useEffect(() => {
    if (!show) return;
    if (existingPluginSlug && existingPluginName) {
      setPluginName(existingPluginName);
      setStep('prefill_pick');
    } else {
      setStep('source');
      setPluginName('');
    }
  }, [show, existingPluginSlug, existingPluginName]);

  const handleClose = () => {
    setStep('source');
    setPluginName('');
    onHide();
  };

  const effectivePluginName = existingPluginName ?? pluginName;
  const effectivePluginSlug =
    existingPluginSlug ??
    (pluginName || existingPluginName || '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  const handleDirectSource = (source: LibrarySourceKind) => {
    onChooseSource({ mode: 'direct', source });
    handleClose();
  };

  const handlePrefillPick = (source: LibrarySourceKind) => {
    const name = effectivePluginName.trim() || effectivePluginSlug;
    onChooseSource({
      mode: 'prefill',
      source,
      pluginName: name,
      pluginSlug: effectivePluginSlug,
    });
    handleClose();
  };

  const itemLabel = isPluginsView ? 'plugin' : 'theme';
  const title =
    step === 'source'
      ? 'Add to library'
      : step === 'prefill_name'
        ? `${isPluginsView ? 'Plugin' : 'Theme'} for new version`
        : 'Add version';

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-lg">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {step === 'source' && (
          <>
            <p className="text-muted small text-uppercase fw-semibold mb-3">Choose source</p>
            <ListGroup variant="flush" className="gap-2">
              <ListGroup.Item
                action
                disabled={disabled}
                className="rounded border py-3"
                onClick={() => handleDirectSource('wordpress.org')}
              >
                <div className="d-flex align-items-start gap-3">
                  <span className="avatar-sm bg-primary bg-opacity-10 text-primary rounded d-inline-flex align-items-center justify-content-center flex-shrink-0">
                    <TbCloudDownload className="fs-4" />
                  </span>
                  <div>
                    <div className="fw-semibold">WordPress.org</div>
                    <div className="small text-muted">
                      {isPluginsView
                        ? 'Search and add from the official plugin directory'
                        : 'Search and add from the official theme directory'}
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
              <ListGroup.Item
                action
                disabled={disabled}
                className="rounded border py-3"
                onClick={() => handleDirectSource('library_upload')}
              >
                <div className="d-flex align-items-start gap-3">
                  <span className="avatar-sm bg-primary bg-opacity-10 text-primary rounded d-inline-flex align-items-center justify-content-center flex-shrink-0">
                    <TbUpload className="fs-4" />
                  </span>
                  <div>
                    <div className="fw-semibold">Library upload</div>
                    <div className="small text-muted">
                      {isPluginsView ? 'Upload a plugin or theme ZIP file' : 'Upload a theme ZIP file'}
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
              {isPluginsView && (
                <ListGroup.Item
                  action
                  disabled={disabled}
                  className="rounded border py-3"
                  onClick={() => handleDirectSource('remote_url')}
                >
                  <div className="d-flex align-items-start gap-3">
                    <span className="avatar-sm bg-primary bg-opacity-10 text-primary rounded d-inline-flex align-items-center justify-content-center flex-shrink-0">
                      <TbLink className="fs-4" />
                    </span>
                    <div>
                      <div className="fw-semibold">Remote URL</div>
                      <div className="small text-muted">HTTPS URL to a plugin ZIP</div>
                    </div>
                  </div>
                </ListGroup.Item>
              )}
            </ListGroup>
          </>
        )}

        {step === 'prefill_name' && (
          <div className="d-flex flex-column gap-3">
            <label className="form-label small text-muted mb-0">
              {isPluginsView ? 'Plugin' : 'Theme'} name / slug hint
            </label>
            <input
              className="form-control"
              value={pluginName}
              onChange={(e) => setPluginName(e.target.value)}
              placeholder={isPluginsView ? 'Plugin name' : 'Theme name'}
            />
            <Button
              variant="primary"
              disabled={!pluginName.trim()}
              onClick={() => setStep('prefill_pick')}
            >
              Continue
            </Button>
            <Button variant="link" className="align-self-start p-0" onClick={() => setStep('source')}>
              Back
            </Button>
          </div>
        )}

        {step === 'prefill_pick' && (
          <>
            <p className="text-muted small mb-3">
              Choose source for a new version of this {itemLabel}.
            </p>
            <ListGroup variant="flush" className="gap-2">
              <ListGroup.Item
                action
                className="rounded border"
                onClick={() => handlePrefillPick('wordpress.org')}
              >
                WordPress.org
              </ListGroup.Item>
              <ListGroup.Item
                action
                className="rounded border"
                onClick={() => handlePrefillPick('library_upload')}
              >
                Library upload
              </ListGroup.Item>
              {isPluginsView && (
                <ListGroup.Item
                  action
                  className="rounded border"
                  onClick={() => handlePrefillPick('remote_url')}
                >
                  Remote URL
                </ListGroup.Item>
              )}
            </ListGroup>
            {!existingPluginSlug && (
              <Button variant="link" className="mt-2 p-0" onClick={() => setStep('prefill_name')}>
                Back
              </Button>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default AddLibrarySourceModal;
