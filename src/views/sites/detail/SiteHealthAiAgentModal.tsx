import { useAuth } from '@/domains/auth';
import { healthAiExecuteOne, useHealthAiSuggest } from '@/domains/sites';
import type { HealthAiSuggestion, HealthAiSuggestionKind, Site } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';

const KIND_LABELS: Record<HealthAiSuggestionKind, string> = {
  health_refresh: 'Refresh health snapshot',
  plugin_activate: 'Activate plugin',
  plugin_deactivate: 'Deactivate plugin',
  plugin_update: 'Update plugin',
  hub_invoke: 'Registered hub handler',
  advice_only: 'Guidance only',
};

type ProgressRow = {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
};

export type SiteHealthAiAgentModalProps = {
  site: Site;
  show: boolean;
  /** Increment when opening so analysis re-runs (avoids stale Strict Mode / duplicate issues). */
  sessionKey: number;
  onHide: () => void;
};

export function SiteHealthAiAgentModal({ site, show, sessionKey, onHide }: SiteHealthAiAgentModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const suggest = useHealthAiSuggest();

  const [phase, setPhase] = useState<'analyze' | 'review' | 'run' | 'done'>('analyze');
  const [suggestions, setSuggestions] = useState<HealthAiSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [progressItems, setProgressItems] = useState<ProgressRow[]>([]);
  const [nextHint, setNextHint] = useState('');
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [statusHeadline, setStatusHeadline] = useState('');
  const lastSessionRef = useRef<number | null>(null);

  const resetForSession = useCallback(() => {
    suggest.reset();
    setPhase('analyze');
    setSuggestions([]);
    setSelectedIds(new Set());
    setProgressItems([]);
    setNextHint('');
    setRunError(null);
    setRunning(false);
    setStatusHeadline('');
  }, [suggest]);

  useEffect(() => {
    if (!show) {
      lastSessionRef.current = null;
      return;
    }
    if (lastSessionRef.current === sessionKey) return;
    lastSessionRef.current = sessionKey;
    resetForSession();
    suggest.mutate(site.$id, {
      onSuccess: (d) => {
        setSuggestions(d.suggestions ?? []);
        setPhase('review');
      },
      onError: (e) => {
        setRunError(e.message);
        setPhase('review');
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one analysis per sessionKey when modal opens
  }, [show, sessionKey, site.$id]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedSteps = useMemo(
    () => suggestions.filter((s) => selectedIds.has(s.id)),
    [suggestions, selectedIds],
  );

  const runSelected = async () => {
    if (selectedSteps.length === 0 || running) return;
    setRunning(true);
    setPhase('run');
    setRunError(null);
    setStatusHeadline('');
    setProgressItems(
      selectedSteps.map((s) => ({
        id: s.id,
        title: s.title,
        status: 'pending' as const,
      })),
    );

    for (let i = 0; i < selectedSteps.length; i++) {
      const step = selectedSteps[i];
      const upcoming = selectedSteps[i + 1];
      setStatusHeadline(step.title);
      setNextHint(upcoming ? `After this finishes: ${upcoming.title}` : 'Final step…');
      setProgressItems((prev) =>
        prev.map((p) => (p.id === step.id ? { ...p, status: 'running' as const } : p)),
      );
      try {
        const result = await healthAiExecuteOne(site.$id, step);
        setProgressItems((prev) =>
          prev.map((p) =>
            p.id === step.id
              ? { ...p, status: 'done' as const, detail: result.message ?? undefined }
              : p,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setProgressItems((prev) =>
          prev.map((p) =>
            p.id === step.id ? { ...p, status: 'error' as const, detail: msg } : p,
          ),
        );
        setRunError(msg);
        break;
      }
    }

    setNextHint('');
    setStatusHeadline('');
    setPhase('done');
    setRunning(false);
    void queryClient.invalidateQueries({ queryKey: ['site', site.$id] });
    if (user?.$id) void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
  };

  const handleClose = () => {
    resetForSession();
    onHide();
  };

  const analyzing = phase === 'analyze' && suggest.isPending;
  const sourceNote =
    suggest.data?.source === 'openai'
      ? 'Suggestions from AI (review carefully before applying).'
      : suggest.data?.source === 'heuristic'
        ? 'Rule-based suggestions (set OPENAI_API_KEY on the function for richer ideas).'
        : null;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Health assistant</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {analyzing ? (
          <div className="d-flex align-items-center gap-2 py-4">
            <Spinner animation="border" size="sm" />
            <span className="text-muted">Analyzing Site Health data…</span>
          </div>
        ) : null}

        {!analyzing && phase === 'review' && runError && !suggestions.length ? (
          <Alert variant="danger" className="mb-0">
            {runError}
          </Alert>
        ) : null}

        {!analyzing && suggestions.length > 0 && (phase === 'review' || phase === 'run' || phase === 'done') ? (
          <>
            {sourceNote ? <p className="text-muted fs-sm mb-3">{sourceNote}</p> : null}
            {phase === 'review' ? (
              <>
                <p className="mb-3">
                  Select the actions you want the hub to run on <strong>{site.siteName || site.siteUrl}</strong>.
                  Plugin and hub-handler steps use the bridge with your linked WordPress admin user when the site
                  document has a username.
                </p>
                <div className="d-flex flex-column gap-3 mb-3">
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="border rounded p-3"
                      style={{ background: 'var(--bs-tertiary-bg, #f8f9fa)' }}
                    >
                      <Form.Check
                        type="checkbox"
                        id={`health-ai-${s.id}`}
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleId(s.id)}
                        label={
                          <span>
                            <span className="fw-semibold">{s.title}</span>
                            <span className="text-muted fs-xs ms-2">
                              ({KIND_LABELS[s.kind] ?? s.kind})
                            </span>
                          </span>
                        }
                      />
                      {s.description ? (
                        <p className="text-muted fs-sm mb-0 mt-2 ms-4 ps-1">{s.description}</p>
                      ) : null}
                      {s.payload?.plugin ? (
                        <p className="fs-xs text-muted mb-0 mt-1 ms-4 ps-1">
                          <code>{s.payload.plugin}</code>
                        </p>
                      ) : null}
                      {s.payload?.handler ? (
                        <p className="fs-xs text-muted mb-0 mt-1 ms-4 ps-1">
                          Handler: <code>{s.payload.handler}</code>
                          {s.payload.args && Object.keys(s.payload.args).length > 0 ? (
                            <span className="ms-1">({JSON.stringify(s.payload.args)})</span>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <Button type="button" variant="light" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={selectedSteps.length === 0 || running}
                    onClick={() => void runSelected()}
                  >
                    Run selected ({selectedSteps.length})
                  </Button>
                </div>
              </>
            ) : null}

            {(phase === 'run' || phase === 'done') && progressItems.length > 0 ? (
              <div className="mt-3 pt-3 border-top">
                <h6 className="fs-sm text-uppercase text-muted mb-2">Progress</h6>
                {phase === 'run' && statusHeadline ? (
                  <p className="mb-2">
                    <span className="fw-semibold">Running:</span> {statusHeadline}
                  </p>
                ) : null}
                {phase === 'run' && nextHint ? (
                  <p className="text-muted fs-sm mb-3">{nextHint}</p>
                ) : null}
                <ul className="list-unstyled mb-0">
                  {progressItems.map((row) => (
                    <li key={row.id} className="mb-2 d-flex gap-2 align-items-start">
                      <span className="text-nowrap fs-sm" aria-hidden>
                        {row.status === 'pending' ? '○' : null}
                        {row.status === 'running' ? <Spinner animation="border" size="sm" /> : null}
                        {row.status === 'done' ? '✓' : null}
                        {row.status === 'error' ? '✗' : null}
                      </span>
                      <div>
                        <div className="fs-sm fw-medium">{row.title}</div>
                        {row.detail ? (
                          <div
                            className={`fs-xs ${row.status === 'error' ? 'text-danger' : 'text-muted'}`}
                          >
                            {row.detail}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                {runError && phase === 'done' ? (
                  <Alert variant="warning" className="mt-3 mb-0">
                    Stopped after an error: {runError}
                  </Alert>
                ) : null}
                {phase === 'done' && !runError ? (
                  <Alert variant="success" className="mt-3 mb-0">
                    All selected steps finished. Refresh the Health tab if you ran a health snapshot update.
                  </Alert>
                ) : null}
                {phase === 'done' ? (
                  <div className="d-flex justify-content-end mt-3">
                    <Button type="button" variant="primary" onClick={handleClose}>
                      Close
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </Modal.Body>
    </Modal>
  );
}
