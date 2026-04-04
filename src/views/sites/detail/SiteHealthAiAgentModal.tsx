import { useAuth } from '@/domains/auth';
import {
  healthAiDryRunAnalyze,
  healthAiDryRunPlan,
  healthAiExecuteOne,
  type HealthAiDryRunContextOverrides,
} from '@/domains/sites';
import { buildLocalHealthAiSuggestions } from '@/lib/healthAiLocalSuggestions';
import type {
  HealthAiDryRunAnalyzeResponse,
  HealthAiDryRunPlanResponse,
  HealthAiSuggestion,
  HealthAiSuggestionKind,
  HealthDryRunAnswers,
  Site,
} from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Nav, Spinner, Tab } from 'react-bootstrap';

const KIND_LABELS: Record<HealthAiSuggestionKind, string> = {
  health_refresh: 'Refresh health snapshot',
  plugin_activate: 'Activate plugin',
  plugin_deactivate: 'Deactivate plugin',
  plugin_update: 'Update plugin',
  plugin_uninstall: 'Uninstall plugin',
  theme_activate: 'Activate theme',
  theme_update: 'Update theme',
  theme_delete: 'Delete theme',
  hub_invoke: 'Registered hub handler',
  advice_only: 'Guidance only',
};

const DEFAULT_DRY_ANSWERS: HealthDryRunAnswers = {
  removeInactivePlugins: false,
  maxInactivePluginsToRemove: 5,
  removeInactiveThemes: false,
  maxInactiveThemesToRemove: 3,
  runPluginUpdates: false,
  maxPluginUpdates: 10,
  runThemeUpdatesForInactive: false,
  maxThemeUpdates: 5,
  includeHealthRefresh: true,
  flushCaches: false,
  optimizeDatabase: false,
  purgeSpamComments: false,
  spamCommentLimit: 200,
  searchVisibility: 'unchanged',
};

function stripSimulated(step: HealthAiSuggestion): HealthAiSuggestion {
  const { simulated: _s, ...rest } = step;
  return rest;
}

type ProgressRow = {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
};

export type SiteHealthAiAgentModalProps = {
  site: Site;
  show: boolean;
  /** Increment when opening so analysis re-runs (parent also sets key for a clean remount). */
  sessionKey: number;
  onHide: () => void;
};

export function SiteHealthAiAgentModal({ site, show, sessionKey, onHide }: SiteHealthAiAgentModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [mainTab, setMainTab] = useState<'run' | 'dry'>('run');
  const [customRunSteps, setCustomRunSteps] = useState<HealthAiSuggestion[] | null>(null);

  const [phase, setPhase] = useState<'review' | 'run' | 'done'>('review');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [progressItems, setProgressItems] = useState<ProgressRow[]>([]);
  const [nextHint, setNextHint] = useState('');
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [statusHeadline, setStatusHeadline] = useState('');

  const [dryAnswers, setDryAnswers] = useState<HealthDryRunAnswers>(() => ({ ...DEFAULT_DRY_ANSWERS }));
  const [dryUiPhase, setDryUiPhase] = useState<'start' | 'loading_analyze' | 'questions' | 'loading_plan' | 'result'>(
    'start',
  );
  const [analyzeData, setAnalyzeData] = useState<HealthAiDryRunAnalyzeResponse | null>(null);
  const [planData, setPlanData] = useState<HealthAiDryRunPlanResponse | null>(null);
  const [dryError, setDryError] = useState<string | null>(null);

  const metaOverrides = useMemo((): HealthAiDryRunContextOverrides => {
    const h = site.healthMeta;
    const p = site.pluginsMeta;
    const t = site.themesMeta;
    return {
      ...(typeof h === 'string' && h.trim() ? { health_meta: h } : {}),
      ...(typeof p === 'string' && p.trim() ? { plugins_meta: p } : {}),
      ...(typeof t === 'string' && t.trim() ? { themes_meta: t } : {}),
    };
  }, [site.healthMeta, site.pluginsMeta, site.themesMeta]);

  const defaultSuggestions = useMemo(() => {
    if (!show) return [];
    return buildLocalHealthAiSuggestions(site.healthMeta);
  }, [show, sessionKey, site.$id, site.healthMeta]);

  const suggestions = useMemo(() => {
    if (customRunSteps && customRunSteps.length > 0) return customRunSteps;
    return defaultSuggestions;
  }, [customRunSteps, defaultSuggestions]);

  const resetDryUi = useCallback(() => {
    setDryAnswers({ ...DEFAULT_DRY_ANSWERS });
    setDryUiPhase('start');
    setAnalyzeData(null);
    setPlanData(null);
    setDryError(null);
  }, []);

  const resetRunUi = useCallback(() => {
    setPhase('review');
    setSelectedIds(new Set());
    setProgressItems([]);
    setNextHint('');
    setRunError(null);
    setRunning(false);
    setStatusHeadline('');
    setCustomRunSteps(null);
    setMainTab('run');
  }, []);

  const handleClose = () => {
    resetRunUi();
    resetDryUi();
    onHide();
  };

  useEffect(() => {
    if (!show) return;
    resetRunUi();
    resetDryUi();
  }, [show, sessionKey, site.$id, resetRunUi, resetDryUi]);

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
        const result = await healthAiExecuteOne(site.$id, stripSimulated(step));
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

  const runDryAnalyze = async () => {
    setDryError(null);
    setDryUiPhase('loading_analyze');
    try {
      const res = await healthAiDryRunAnalyze(site.$id, metaOverrides);
      setAnalyzeData(res);
      setPlanData(null);
      setDryUiPhase('questions');
    } catch (e) {
      setDryError(e instanceof Error ? e.message : String(e));
      setDryUiPhase('start');
    }
  };

  const runDryPlan = async () => {
    setDryError(null);
    setDryUiPhase('loading_plan');
    try {
      const res = await healthAiDryRunPlan(site.$id, dryAnswers, metaOverrides);
      setPlanData(res);
      setDryUiPhase('result');
    } catch (e) {
      setDryError(e instanceof Error ? e.message : String(e));
      setDryUiPhase('questions');
    }
  };

  const applyDryPlanForReal = () => {
    const steps = planData?.plannedSteps ?? [];
    const executable = steps.filter((s) => s.kind !== 'advice_only').map(stripSimulated);
    if (executable.length === 0) {
      setDryError('No executable steps in this preview (only guidance or empty plan).');
      return;
    }
    setCustomRunSteps(executable);
    setSelectedIds(new Set(executable.map((s) => s.id)));
    setPhase('review');
    setRunError(null);
    setProgressItems([]);
    setMainTab('run');
  };

  const reviewReady = phase === 'review' || phase === 'run' || phase === 'done';

  const showEmptySuggestions =
    show &&
    mainTab === 'run' &&
    reviewReady &&
    !runError &&
    suggestions.length === 0 &&
    phase === 'review';

  const showMainList = show && mainTab === 'run' && suggestions.length > 0 && reviewReady;

  const summary = analyzeData?.summary;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Health assistant</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tab.Container
          activeKey={mainTab}
          onSelect={(k) => {
            const key = k === 'dry' ? 'dry' : 'run';
            setMainTab(key);
          }}
        >
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="run">Run for real</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="dry">Dry run</Nav.Link>
            </Nav.Item>
          </Nav>
          <Tab.Content>
            <Tab.Pane eventKey="run">
              {customRunSteps && customRunSteps.length > 0 ? (
                <Alert variant="info" className="py-2">
                  Running checklist loaded from <strong>dry run</strong> preview. Nothing ran until you click Run
                  selected.
                </Alert>
              ) : null}

              {showEmptySuggestions ? (
                <Alert variant="secondary" className="mb-0">
                  No suggestions to show. Run <strong>Check health</strong> on this site so the hub stores a Site
                  Health snapshot in <code>health_meta</code>, try <strong>Dry run</strong> for a custom plan, or open
                  the assistant again after syncing plugins.
                </Alert>
              ) : null}

              {show && runError && phase === 'review' && mainTab === 'run' && suggestions.length === 0 ? (
                <Alert variant="danger" className="mb-0">
                  {runError}
                </Alert>
              ) : null}

              {showMainList ? (
                <>
                  <p className="text-muted fs-sm mb-3">
                    Select the actions you want the hub to run on <strong>{site.siteName || site.siteUrl}</strong>.
                    Plugin, theme, and hub-handler steps use the bridge with your linked WordPress admin user when the
                    site document has a username.
                  </p>
                  {phase === 'review' ? (
                    <>
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
                            {s.payload?.theme ? (
                              <p className="fs-xs text-muted mb-0 mt-1 ms-4 ps-1">
                                Theme: <code>{s.payload.theme}</code>
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
            </Tab.Pane>

            <Tab.Pane eventKey="dry">
              <Alert variant="secondary" className="py-2 mb-3">
                <strong>Dry run:</strong> nothing is changed on your WordPress site until you switch to{' '}
                <strong>Run for real</strong> and execute steps.
              </Alert>

              {dryError ? (
                <Alert variant="danger" className="mb-3">
                  {dryError}
                </Alert>
              ) : null}

              {dryUiPhase === 'start' ? (
                <div>
                  <p className="text-muted fs-sm mb-3">
                    Analyze hub-stored <code>health_meta</code>, <code>plugins_meta</code>, and{' '}
                    <code>themes_meta</code>, answer a few questions, then preview exactly which bridge actions would
                    run.
                  </p>
                  <Button type="button" variant="primary" onClick={() => void runDryAnalyze()}>
                    Start dry run analysis
                  </Button>
                </div>
              ) : null}

              {dryUiPhase === 'loading_analyze' || dryUiPhase === 'loading_plan' ? (
                <div className="d-flex align-items-center gap-2 py-4">
                  <Spinner animation="border" size="sm" />
                  <span>{dryUiPhase === 'loading_analyze' ? 'Analyzing…' : 'Building preview plan…'}</span>
                </div>
              ) : null}

              {dryUiPhase === 'questions' && summary ? (
                <div>
                  <h6 className="fs-sm text-uppercase text-muted mb-2">Analysis summary</h6>
                  <ul className="fs-sm text-muted mb-3">
                    <li>
                      Site Health snapshot: {summary.hasHealthSnapshot ? 'present' : 'missing'} — critical/warning
                      checks: {summary.criticalOrWarningChecks}
                    </li>
                    <li>Inactive plugins (synced): {summary.inactivePlugins.length}</li>
                    <li>Inactive themes (synced): {summary.inactiveThemes.length}</li>
                    <li>Plugins with updates: {summary.pluginsWithUpdates.length}</li>
                    <li>Inactive themes with updates: {summary.inactiveThemesWithUpdates.length}</li>
                  </ul>
                  {analyzeData?.warnings && analyzeData.warnings.length > 0 ? (
                    <Alert variant="warning" className="py-2 fs-sm mb-3">
                      {analyzeData.warnings.map((w) => (
                        <div key={w}>{w}</div>
                      ))}
                    </Alert>
                  ) : null}

                  <h6 className="fs-sm text-uppercase text-muted mb-2">Questions</h6>
                  <div className="d-flex flex-column gap-3 mb-3">
                    <Form.Check
                      type="switch"
                      id="dry-refresh"
                      checked={!!dryAnswers.includeHealthRefresh}
                      onChange={(e) =>
                        setDryAnswers((a) => ({ ...a, includeHealthRefresh: e.target.checked }))
                      }
                      label="Include refresh Site Health snapshot (first step)"
                    />
                    <Form.Check
                      type="switch"
                      id="dry-flush"
                      checked={!!dryAnswers.flushCaches}
                      onChange={(e) => setDryAnswers((a) => ({ ...a, flushCaches: e.target.checked }))}
                      label="Flush object cache & expired transients (maintenance_flush_caches)"
                    />
                    <Form.Check
                      type="switch"
                      id="dry-db"
                      checked={!!dryAnswers.optimizeDatabase}
                      onChange={(e) => setDryAnswers((a) => ({ ...a, optimizeDatabase: e.target.checked }))}
                      label="Optimize database tables (WordPress prefix only)"
                    />
                    <div>
                      <Form.Check
                        type="switch"
                        id="dry-spam"
                        checked={!!dryAnswers.purgeSpamComments}
                        onChange={(e) => setDryAnswers((a) => ({ ...a, purgeSpamComments: e.target.checked }))}
                        label="Permanently delete spam comments (capped)"
                      />
                      {dryAnswers.purgeSpamComments ? (
                        <Form.Group className="ms-4 mt-2">
                          <Form.Label className="fs-xs text-muted">Max comments to delete (1–2000)</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            max={2000}
                            size="sm"
                            style={{ maxWidth: 120 }}
                            value={dryAnswers.spamCommentLimit ?? 200}
                            onChange={(e) =>
                              setDryAnswers((a) => ({
                                ...a,
                                spamCommentLimit: Number(e.target.value) || 200,
                              }))
                            }
                          />
                        </Form.Group>
                      ) : null}
                    </div>
                    <Form.Group>
                      <Form.Label className="fs-sm">Search engine visibility</Form.Label>
                      <Form.Select
                        size="sm"
                        value={dryAnswers.searchVisibility ?? 'unchanged'}
                        onChange={(e) =>
                          setDryAnswers((a) => ({
                            ...a,
                            searchVisibility: e.target.value as HealthDryRunAnswers['searchVisibility'],
                          }))
                        }
                      >
                        <option value="unchanged">Leave as on the site</option>
                        <option value="allow">Allow search engines to index the site</option>
                        <option value="discourage">Discourage search engines from indexing</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Check
                      type="switch"
                      id="dry-pu"
                      checked={!!dryAnswers.runPluginUpdates}
                      onChange={(e) => setDryAnswers((a) => ({ ...a, runPluginUpdates: e.target.checked }))}
                      label="Update plugins that have updates (from synced meta)"
                    />
                    {dryAnswers.runPluginUpdates ? (
                      <Form.Group className="ms-4">
                        <Form.Label className="fs-xs text-muted">Max plugin updates</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          max={50}
                          size="sm"
                          style={{ maxWidth: 120 }}
                          value={dryAnswers.maxPluginUpdates ?? 10}
                          onChange={(e) =>
                            setDryAnswers((a) => ({
                              ...a,
                              maxPluginUpdates: Number(e.target.value) || 10,
                            }))
                          }
                        />
                      </Form.Group>
                    ) : null}
                    <Form.Check
                      type="switch"
                      id="dry-unplug"
                      checked={!!dryAnswers.removeInactivePlugins}
                      onChange={(e) => setDryAnswers((a) => ({ ...a, removeInactivePlugins: e.target.checked }))}
                      label="Uninstall inactive plugins (destructive)"
                    />
                    {dryAnswers.removeInactivePlugins ? (
                      <Form.Group className="ms-4">
                        <Form.Label className="fs-xs text-muted">Max uninstalls</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          max={30}
                          size="sm"
                          style={{ maxWidth: 120 }}
                          value={dryAnswers.maxInactivePluginsToRemove ?? 5}
                          onChange={(e) =>
                            setDryAnswers((a) => ({
                              ...a,
                              maxInactivePluginsToRemove: Number(e.target.value) || 5,
                            }))
                          }
                        />
                      </Form.Group>
                    ) : null}
                    <Form.Check
                      type="switch"
                      id="dry-del-theme"
                      checked={!!dryAnswers.removeInactiveThemes}
                      onChange={(e) => setDryAnswers((a) => ({ ...a, removeInactiveThemes: e.target.checked }))}
                      label="Delete inactive themes (destructive — can break child themes)"
                    />
                    {dryAnswers.removeInactiveThemes ? (
                      <Form.Group className="ms-4">
                        <Form.Label className="fs-xs text-muted">Max theme deletes</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          max={20}
                          size="sm"
                          style={{ maxWidth: 120 }}
                          value={dryAnswers.maxInactiveThemesToRemove ?? 3}
                          onChange={(e) =>
                            setDryAnswers((a) => ({
                              ...a,
                              maxInactiveThemesToRemove: Number(e.target.value) || 3,
                            }))
                          }
                        />
                      </Form.Group>
                    ) : null}
                    <Form.Check
                      type="switch"
                      id="dry-theme-up"
                      checked={!!dryAnswers.runThemeUpdatesForInactive}
                      onChange={(e) =>
                        setDryAnswers((a) => ({ ...a, runThemeUpdatesForInactive: e.target.checked }))
                      }
                      label="Update inactive themes that have updates"
                    />
                    {dryAnswers.runThemeUpdatesForInactive ? (
                      <Form.Group className="ms-4">
                        <Form.Label className="fs-xs text-muted">Max theme updates</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          max={20}
                          size="sm"
                          style={{ maxWidth: 120 }}
                          value={dryAnswers.maxThemeUpdates ?? 5}
                          onChange={(e) =>
                            setDryAnswers((a) => ({
                              ...a,
                              maxThemeUpdates: Number(e.target.value) || 5,
                            }))
                          }
                        />
                      </Form.Group>
                    ) : null}
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <Button type="button" variant="primary" onClick={() => void runDryPlan()}>
                      Preview plan
                    </Button>
                    <Button type="button" variant="light" onClick={() => setDryUiPhase('start')}>
                      Back
                    </Button>
                  </div>
                </div>
              ) : null}

              {dryUiPhase === 'result' && planData ? (
                <div>
                  <h6 className="fs-sm text-uppercase text-muted mb-2">What the hub would run</h6>
                  {planData.warnings && planData.warnings.length > 0 ? (
                    <Alert variant="warning" className="py-2 fs-sm mb-3">
                      {planData.warnings.map((w) => (
                        <div key={w}>{w}</div>
                      ))}
                    </Alert>
                  ) : null}
                  {(planData.plannedSteps ?? []).length === 0 ? (
                    <p className="text-muted fs-sm mb-3">No steps matched your choices. Enable more options or check synced metadata.</p>
                  ) : null}
                  <div className="d-flex flex-column gap-2 mb-3">
                    {(planData.plannedSteps ?? []).map((s) => (
                      <div
                        key={s.id}
                        className="border rounded p-2 fs-sm"
                        style={{ background: 'var(--bs-tertiary-bg, #f8f9fa)' }}
                      >
                        <span className="fw-semibold">{s.title}</span>
                        <span className="text-muted ms-2">({KIND_LABELS[s.kind] ?? s.kind})</span>
                        {s.simulated ? (
                          <span className="badge bg-secondary ms-2 fs-10">preview</span>
                        ) : null}
                        {s.description ? <p className="text-muted mb-0 mt-1 small">{s.description}</p> : null}
                        {s.payload?.plugin ? (
                          <code className="d-block small mt-1">{s.payload.plugin}</code>
                        ) : null}
                        {s.payload?.theme ? (
                          <code className="d-block small mt-1">{s.payload.theme}</code>
                        ) : null}
                        {s.payload?.handler ? (
                          <span className="small d-block mt-1 text-muted">
                            <code>{s.payload.handler}</code>
                            {s.payload.args && Object.keys(s.payload.args).length > 0
                              ? ` ${JSON.stringify(s.payload.args)}`
                              : ''}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <Button type="button" variant="primary" onClick={applyDryPlanForReal}>
                      Apply this plan for real
                    </Button>
                    <Button
                      type="button"
                      variant="light"
                      onClick={() => {
                        setDryUiPhase('questions');
                        setPlanData(null);
                      }}
                    >
                      Edit answers
                    </Button>
                  </div>
                </div>
              ) : null}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
}
