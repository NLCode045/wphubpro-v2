import { useNotificationContext } from '@/context/useNotificationContext';
import { useAddOfficialPlugin, useAddOfficialTheme } from '@/hooks/useLibrary';
import { getWpThemeInfo } from '@/services/wordpress';
import type { WpPluginInfo } from '@/services/wordpress';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';

type PinWordPressOrgVersionsModalProps = {
  show: boolean;
  onHide: () => void;
  itemKind: 'plugin' | 'theme';
  slug: string;
  displayName: string;
  wpPluginInfo: WpPluginInfo | null | undefined;
  wpPluginInfoLoading: boolean;
  /** Official version keys already in the library (e.g. `1.2.3`, `latest`). */
  existingOfficialVersionKeys: string[];
};

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return y - x;
  }
  return 0;
}

function isSpecialVersionKey(k: string): boolean {
  const t = k.trim().toLowerCase();
  return t === 'trunk' || t === 'development';
}

function sortWpOrgVersionKeys(keys: string[]): string[] {
  const normal = keys.filter((k) => !isSpecialVersionKey(k));
  const special = keys.filter((k) => isSpecialVersionKey(k));
  normal.sort(compareSemverDesc);
  return [...normal, ...special];
}

const PinWordPressOrgVersionsModal = ({
  show,
  onHide,
  itemKind,
  slug,
  displayName,
  wpPluginInfo,
  wpPluginInfoLoading,
  existingOfficialVersionKeys,
}: PinWordPressOrgVersionsModalProps) => {
  const { showNotification } = useNotificationContext();
  const addPlugin = useAddOfficialPlugin();
  const addTheme = useAddOfficialTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pinning, setPinning] = useState(false);

  const { data: themeInfo, isLoading: themeLoading } = useQuery({
    queryKey: ['wpThemeInfo', slug],
    queryFn: () => getWpThemeInfo(slug),
    enabled: show && itemKind === 'theme' && slug.length > 0,
    staleTime: 1000 * 60 * 15,
  });

  const existing = useMemo(() => new Set(existingOfficialVersionKeys), [existingOfficialVersionKeys]);

  const versionsRecord =
    itemKind === 'plugin' ? wpPluginInfo?.versions : themeInfo?.versions;

  const sortedVersionKeys = useMemo(
    () => sortWpOrgVersionKeys(Object.keys(versionsRecord ?? {})),
    [versionsRecord],
  );

  const loading = itemKind === 'plugin' ? wpPluginInfoLoading : themeLoading;
  const dataFailed =
    itemKind === 'plugin' ? !wpPluginInfoLoading && !wpPluginInfo : !themeLoading && !themeInfo;

  const canShowLatestRow = !existing.has('latest');

  useEffect(() => {
    if (show) setSelected(new Set());
  }, [show]);

  const toggleVersion = useCallback((key: string) => {
    if (existing.has(key)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [existing]);

  const handlePin = async () => {
    const keys = [...selected];
    if (keys.length === 0) return;
    setPinning(true);
    try {
      if (itemKind === 'plugin') {
        const info = wpPluginInfo;
        if (!info) return;
        const desc = (info.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        for (const version of keys) {
          await addPlugin.mutateAsync({
            name: info.name || displayName,
            slug: info.slug || slug,
            version,
            author: info.author,
            short_description: desc.slice(0, 10000),
            prefillPluginSlug: slug,
            prefillPluginName: displayName,
            __silent: true,
          });
        }
      } else {
        const info = themeInfo;
        if (!info) return;
        for (const version of keys) {
          await addTheme.mutateAsync({
            name: info.name || displayName,
            slug: info.slug || slug,
            version,
            author: info.author,
            short_description: info.description?.slice(0, 500),
            prefillThemeSlug: slug,
            prefillThemeName: displayName,
            __silent: true,
          });
        }
      }
      showNotification({
        title: 'Versions pinned',
        message:
          keys.length === 1
            ? `Pinned WordPress.org version ${keys[0]}.`
            : `Pinned ${keys.length} WordPress.org versions.`,
        variant: 'success',
      });
      setSelected(new Set());
      onHide();
    } catch {
      /* useLibrary onError shows failure */
    } finally {
      setPinning(false);
    }
  };

  const busy = pinning || addPlugin.isPending || addTheme.isPending;

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable centered>
      <Modal.Header closeButton>
        <Modal.Title>Pin WordPress.org versions</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small mb-3">
          Select one or more official versions for <span className="fw-medium text-body">{displayName}</span>. Already
          pinned versions are disabled.
        </p>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" size="sm" role="status" />
            <p className="text-muted small mt-2 mb-0">Loading version list from WordPress.org…</p>
          </div>
        ) : dataFailed ? (
          <p className="text-danger small mb-0">Could not load {itemKind} data from WordPress.org.</p>
        ) : sortedVersionKeys.length === 0 && !canShowLatestRow ? (
          <p className="text-muted small mb-0">
            No downloadable version list was returned. This item may not be hosted on WordPress.org, or the directory
            is temporarily unavailable.
          </p>
        ) : (
          <>
            {sortedVersionKeys.length > 0 ? (
              <div className="row row-cols-2 row-cols-sm-3 row-cols-lg-5 g-2 mb-3">
                {sortedVersionKeys.map((ver) => (
                  <div key={ver} className="col">
                    <Form.Check
                      id={`pin-wp-org-${itemKind}-${slug}-${ver}`}
                      type="checkbox"
                      className="small"
                      label={ver}
                      checked={selected.has(ver)}
                      disabled={existing.has(ver) || busy}
                      onChange={() => toggleVersion(ver)}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {canShowLatestRow ? (
              <div className="border-top border-light pt-3 mt-1">
                <Form.Check
                  id={`pin-wp-org-${itemKind}-${slug}-latest`}
                  type="checkbox"
                  className="small"
                  label="Latest (track stable release from WordPress.org)"
                  checked={selected.has('latest')}
                  disabled={busy}
                  onChange={() => toggleVersion('latest')}
                />
              </div>
            ) : null}
            {sortedVersionKeys.length === 0 && canShowLatestRow ? (
              <p className="text-muted small mb-0">
                No numbered builds were listed; you can still pin <strong>Latest</strong> to follow WordPress.org stable.
              </p>
            ) : null}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" size="sm" onClick={onHide} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={busy || selected.size === 0 || loading || dataFailed}
          onClick={() => void handlePin()}
        >
          {pinning ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Pinning…
            </>
          ) : (
            `Pin selected (${selected.size})`
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PinWordPressOrgVersionsModal;
