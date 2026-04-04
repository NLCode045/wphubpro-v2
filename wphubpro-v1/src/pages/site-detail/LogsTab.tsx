/**
 * Logs tab – sub-tabs: Bridge Logs, Error Logs, Execution Logs (Appwrite wp-proxy for this site).
 * Inclusief Noodherstel functionaliteit voor Fatal Errors via JWT.
 */
import React, { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { Tabs, Tab } from '@mui/material';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import TableRow from '@mui/material/TableRow';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import { 
  useWordPress,
  useSiteErrorLog,
} from '../../hooks/useWordPress';
import { useSite } from '../../domains/sites';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';
import { functions } from '../../services/appwrite';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function decodeEndpoint(endpoint: string | undefined): string {
  if (!endpoint) return '—';
  try {
    const decoded = decodeURIComponent(endpoint);
    return decoded.split('?')[0];
  } catch {
    return endpoint.split('?')[0] || endpoint;
  }
}

const SENSITIVE_LOG_KEYS = new Set([
  'zip_base64',
  'secret',
  'api_key',
  'apiKey',
  'bridge_secret',
  'encrypted_api_key',
  'password',
  'authorization',
  'Authorization',
]);

/** Shorten noisy values in log JSON for UI (tokens, base64, nested JSON strings). */
function redactForLogView(value: unknown, depth = 0): unknown {
  if (depth > 12) return '[…]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const len = value.length;
    if (len > 400 && /^[A-Za-z0-9+/=\s_-]+$/.test(value.replace(/\s/g, ''))) {
      return `[base64 / binary ~${len} chars]`;
    }
    if (len > 48 && /^[a-f0-9:]+$/i.test(value.replace(/:/g, ''))) {
      return `[token ~${len} hex chars]`;
    }
    if (len > 4000) return `${value.slice(0, 4000)}…`;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactForLogView(v, depth + 1));
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (SENSITIVE_LOG_KEYS.has(k)) {
        const s = typeof v === 'string' ? v.length : JSON.stringify(v).length;
        out[k] = `[redacted ~${s} chars]`;
        continue;
      }
      out[k] = redactForLogView(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Recursively parse JSON strings in objects (wp-proxy double-encoded body, etc.). */
function unwrapJsonValue(v: unknown, depth = 0): unknown {
  if (depth > 10) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        return unwrapJsonValue(JSON.parse(t), depth + 1);
      } catch {
        return v;
      }
    }
    return v;
  }
  if (Array.isArray(v)) {
    return v.map((x) => unwrapJsonValue(x, depth + 1));
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      out[k] = unwrapJsonValue(o[k], depth + 1);
    }
    return out;
  }
  return v;
}

/** Pretty-print request/response blobs from wp-proxy / bridge (readable + redacted). */
function formatLogDetailBlock(raw: string | undefined): string {
  if (raw == null || raw === '') return '—';
  const trimmed = raw.trim();
  try {
    let parsed: unknown = trimmed;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      parsed = JSON.parse(trimmed);
    }
    parsed = unwrapJsonValue(parsed, 0);
    return JSON.stringify(redactForLogView(parsed), null, 2);
  } catch {
    return trimmed.length > 8000 ? `${trimmed.slice(0, 8000)}…` : trimmed;
  }
}

const preLogSx = {
  m: 0,
  p: 1.5,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  fontSize: '0.75rem',
  overflow: 'auto',
  maxHeight: 320,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'monospace',
} as const;

interface LogsTabProps {
  siteId: string;
}

type IncomingLogEntry = {
  type: string;
  time: string;
  plugins?: boolean;
  themes?: boolean;
  wp_meta?: boolean;
};

function incomingLogSummary(entry: IncomingLogEntry): string {
  if (entry.type === 'meta_sync') {
    const parts: string[] = [];
    if (entry.plugins) parts.push('plugins');
    if (entry.themes) parts.push('themes');
    if (entry.wp_meta) parts.push('WP / PHP');
    return parts.length ? `Synced to Hub (${parts.join(' · ')})` : 'Synced to Hub';
  }
  if (entry.type === 'heartbeat') return 'Heartbeat';
  if (entry.type === 'plugin_theme_update') {
    return `Plugin/theme update (plugins: ${entry.plugins ? 'yes' : 'no'}, themes: ${entry.themes ? 'yes' : 'no'})`;
  }
  return entry.type;
}

const IncomingLogRow: React.FC<{ entry: IncomingLogEntry }> = ({ entry }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => setOpen((o) => !o)}>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatTime(entry.time)}</SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ fontSize: '0.75rem' }}>
            {incomingLogSummary(entry)}
          </SoftTypography>
        </DataTableBodyCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={2} sx={{ py: 0, borderBottom: open ? '1px solid' : 0, borderColor: 'divider' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <SoftBox sx={{ py: 1.5, px: 2, bgcolor: 'grey.50' }}>
              <SoftTypography variant="caption" fontWeight="bold" color="textSecondary" display="block" sx={{ mb: 0.5 }}>Details</SoftTypography>
              <SoftBox component="pre" sx={{ m: 0, p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', maxHeight: 240, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {JSON.stringify(redactForLogView(entry), null, 2)}
              </SoftBox>
            </SoftBox>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

/** Derive missed heartbeat events from consecutive heartbeat times. Expected interval ~60s; gap > 90s = missed. */
function deriveMissedHeartbeats(incoming: Array<{ type: string; time: string }>): Array<{ time: string; gapMinutes: number }> {
  const heartbeats = incoming
    .filter((e) => e.type === 'heartbeat' && e.time)
    .map((e) => ({ time: e.time }))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const result: Array<{ time: string; gapMinutes: number }> = [];
  const MISSED_THRESHOLD_MS = 90 * 1000; // 90s
  for (let i = 1; i < heartbeats.length; i++) {
    const prev = new Date(heartbeats[i - 1].time).getTime();
    const curr = new Date(heartbeats[i].time).getTime();
    const gapMs = curr - prev;
    if (gapMs > MISSED_THRESHOLD_MS) {
      const gapMinutes = Math.round(gapMs / 60000);
      result.push({ time: new Date(prev + 60000).toISOString(), gapMinutes });
    }
  }
  return result.reverse(); // newest first
}

function HeartbeatLogsPanel({ siteId, siteEnabled }: { siteId: string; siteEnabled?: boolean }) {
  const { data: site } = useSite(siteId);
  const lastHeartbeat = site?.connectionStatus?.heartbeatUpdatedAt ?? (site as any)?.heartbeatUpdatedAt ?? (site as any)?.heartbeat_updated_at;
  const incoming = site?.logData?.incoming ?? [];
  const missed = deriveMissedHeartbeats(incoming);

  if (!siteEnabled) {
    return (
      <SoftBox p={3}>
        <SoftTypography variant="body2" color="textSecondary">Site is disabled. Enable to receive heartbeats.</SoftTypography>
      </SoftBox>
    );
  }

  return (
    <>
      <SoftBox p={2} sx={{ borderBottom: '1px solid', borderColor: 'grey.200', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <SoftTypography variant="caption" fontWeight="bold" color="secondary">
          Last heartbeat received
        </SoftTypography>
        <SoftTypography variant="button" color={lastHeartbeat ? 'dark' : 'secondary'}>
          {lastHeartbeat ? formatTime(lastHeartbeat) : 'No heartbeat yet'}
        </SoftTypography>
        <SoftTypography variant="caption" color="secondary" sx={{ mt: 1 }}>
          Only missed heartbeats are logged below (expected interval ~60s).
        </SoftTypography>
      </SoftBox>
      <ScrollableTableWrapper maxHeight="55vh">
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', '& thead th': { position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'background.paper', borderBottom: '1px solid rgba(0,0,0,0.08)' } }}>
          <SoftBox component="thead">
            <TableRow>
              <DataTableHeadCell width="25%" pl={5} color="#4F5482">Tijd</DataTableHeadCell>
              <DataTableHeadCell width="75%" pl={undefined} color="#4F5482">Type</DataTableHeadCell>
            </TableRow>
          </SoftBox>
          <TableBody>
            {missed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <SoftTypography variant="caption" color="secondary">No missed heartbeats.</SoftTypography>
                </TableCell>
              </TableRow>
            ) : (
              missed.map((entry, i) => (
                <TableRow key={i} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <DataTableBodyCell>
                    <SoftTypography component="span" sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatTime(entry.time)}</SoftTypography>
                  </DataTableBodyCell>
                  <DataTableBodyCell>
                    <SoftTypography component="span" variant="caption" color="warning">
                      Heartbeat missed (gap {entry.gapMinutes} min)
                    </SoftTypography>
                  </DataTableBodyCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>
    </>
  );
}

function IncomingLogsPanel({ siteId, siteEnabled }: { siteId: string; siteEnabled?: boolean }) {
  const { data: site } = useSite(siteId);
  const entries = (site?.logData?.incoming ?? [])
    .filter((e) => e.type !== 'heartbeat')
    .slice()
    .reverse();

  if (!siteEnabled) {
    return (
      <SoftBox p={3}>
        <SoftTypography variant="body2" color="textSecondary">Site is disabled. Enable to receive heartbeats and plugin/theme updates.</SoftTypography>
      </SoftBox>
    );
  }

  return (
    <>
      <SoftBox p={2} sx={{ borderBottom: '1px solid', borderColor: 'grey.200' }}>
        <SoftTypography variant="caption" color="textSecondary">
          INCOMING: Bridge heartbeats and plugin/theme updates received from the bridge.
        </SoftTypography>
      </SoftBox>
      <ScrollableTableWrapper maxHeight="55vh">
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', '& thead th': { position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'background.paper', borderBottom: '1px solid rgba(0,0,0,0.08)' } }}>
          <SoftBox component="thead">
            <TableRow>
              <DataTableHeadCell width="25%" pl={5} color="#4F5482">Tijd</DataTableHeadCell>
              <DataTableHeadCell width="75%" pl={undefined} color="#4F5482">Type</DataTableHeadCell>
            </TableRow>
          </SoftBox>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <SoftTypography variant="caption" color="textSecondary">No incoming logs yet.</SoftTypography>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry, i) => (
                <IncomingLogRow key={i} entry={entry} />
              ))
            )}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>
    </>
  );
}

export interface ParsedErrorLogEntry {
  raw: string;
  timestamp: string;
  logType: string;
  file: string | null;
  line: number | null;
  message: string;
}

const PHP_ERROR_LINE_RE = /^\[([^\]]+)\]\s*PHP\s+(\w+(?:\s+\w+)?):\s*(.+)$/i;
const FILE_LINE_RE = /\s+(?:thrown\s+)?in\s+(.+?)\s+on\s+line\s+(\d+)\s*$/;
const FILE_LINE_FALLBACK_RE = /([^\s()]+\.php)[:(](\d+)\)?/;

function extractFileLine(text: string): { file: string; line: number } | null {
  const m = FILE_LINE_RE.exec(text);
  if (m) return { file: m[1].trim(), line: parseInt(m[2], 10) };
  const m2 = FILE_LINE_FALLBACK_RE.exec(text);
  if (m2) return { file: m2[1].trim(), line: parseInt(m2[2], 10) };
  return null;
}

function parseSingleErrorLine(raw: string): Partial<ParsedErrorLogEntry> & { message: string } | null {
  const main = PHP_ERROR_LINE_RE.exec(raw);
  if (!main) return null;
  const timestamp = main[1].trim();
  const logType = main[2].trim();
  let msg = main[3].trim();
  const fileLine = extractFileLine(raw);
  if (fileLine) {
    const suffixMatch = FILE_LINE_RE.exec(msg);
    if (suffixMatch) msg = msg.slice(0, msg.length - suffixMatch[0].length).trim();
    return { raw, timestamp, logType, file: fileLine.file, line: fileLine.line, message: msg };
  }
  return { raw, timestamp, logType, file: null, line: null, message: msg };
}

function parseErrorLogLines(lines: string[]): ParsedErrorLogEntry[] {
  const entries: ParsedErrorLogEntry[] = [];
  let current: ParsedErrorLogEntry | null = null;
  for (const raw of lines) {
    const parsed = parseSingleErrorLine(raw);
    if (parsed) {
      if (current) entries.push(current);
      current = {
        raw: parsed.raw ?? '',
        timestamp: parsed.timestamp ?? '',
        logType: parsed.logType ?? '',
        file: parsed.file ?? null,
        line: parsed.line ?? null,
        message: parsed.message,
      };
    } else if (current) {
      current.message = current.message + '\n' + raw;
      current.raw = current.raw + '\n' + raw;
      if (current.file == null && current.line == null) {
        const fl = extractFileLine(current.raw);
        if (fl) {
          current.file = fl.file;
          current.line = fl.line;
        }
      }
    }
  }
  if (current) entries.push(current);
  return entries;
}

const BRIDGE_LOG_ACTION_RE = /^\[([^\]]+)\]\s*\[WPHubPro Bridge\]\s*log_action:\s*(.+)$/;

interface ParsedBridgeLogEntry {
  timestamp: string;
  payload: Record<string, unknown> | null;
  rawJson: string;
}

function parseBridgeLogLines(lines: string[]): ParsedBridgeLogEntry[] {
  const out: ParsedBridgeLogEntry[] = [];
  for (const line of lines) {
    const m = BRIDGE_LOG_ACTION_RE.exec(line.trim());
    if (!m) continue;
    let payload: Record<string, unknown> | null = null;
    try {
      payload = JSON.parse(m[2]) as Record<string, unknown>;
    } catch {
      payload = null;
    }
    out.push({ timestamp: m[1], payload, rawJson: m[2] });
  }
  return out.reverse();
}

function bridgeLogSummaryLine(action: unknown, endpoint: unknown): string {
  const ep = typeof endpoint === 'string' ? endpoint : '';
  const act = typeof action === 'string' ? action : '';
  if (/^https?:\/\//i.test(act)) {
    try {
      const host = new URL(act).host;
      return ep ? `${host} · ${ep}` : host;
    } catch {
      return ep || act || '—';
    }
  }
  if (act && ep) return `${act} · ${ep}`;
  return act || ep || '—';
}

function bridgeResponseSummary(payload: Record<string, unknown> | null): { label: string; color: 'success' | 'error' | 'default' } {
  if (!payload || typeof payload.response !== 'object' || payload.response === null) {
    return { label: '—', color: 'default' };
  }
  const r = payload.response as Record<string, unknown>;
  if (r.success === true) {
    const bits: string[] = ['Success'];
    if (typeof r.plugins === 'number') bits.push(`${r.plugins} plugins`);
    if (typeof r.themes === 'number') bits.push(`${r.themes} themes`);
    if (r.wp_meta === true) bits.push('wp_meta');
    return { label: bits.join(' · '), color: 'success' };
  }
  if (r.error != null) return { label: String(r.error).slice(0, 96), color: 'error' };
  return { label: 'Open row for details', color: 'default' };
}

const BridgePhpLogRow: React.FC<{ entry: ParsedBridgeLogEntry }> = ({ entry }) => {
  const [open, setOpen] = useState(false);
  const p = entry.payload;
  const action = p?.action;
  const endpoint = p?.endpoint;
  const sum = bridgeResponseSummary(p);
  const detailJson =
    p != null
      ? JSON.stringify(redactForLogView(p), null, 2)
      : entry.rawJson.length > 6000
        ? `${entry.rawJson.slice(0, 6000)}…`
        : entry.rawJson;

  return (
    <>
      <TableRow sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => setOpen((o) => !o)}>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
            {entry.timestamp}
          </SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ fontSize: '0.75rem', wordBreak: 'break-word' }}>
            {bridgeLogSummaryLine(action, endpoint)}
          </SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <Chip
            component="span"
            label={sum.label}
            size="small"
            color={sum.color === 'success' ? 'success' : sum.color === 'error' ? 'error' : 'default'}
            variant={sum.color === 'default' ? 'outlined' : 'filled'}
            sx={{ height: 22, fontSize: '0.7rem', maxWidth: '100%', '& .MuiChip-label': { px: 1, overflow: 'hidden', textOverflow: 'ellipsis' } }}
          />
        </DataTableBodyCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={3} sx={{ py: 0, borderBottom: open ? '1px solid' : 0, borderColor: 'divider' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <SoftBox sx={{ py: 1.5, px: 2, bgcolor: 'grey.50' }}>
              <SoftTypography variant="caption" fontWeight="bold" color="secondary" display="block" sx={{ mb: 0.5 }}>
                Full entry (redacted)
              </SoftTypography>
              <SoftBox component="pre" sx={preLogSx}>
                {detailJson}
              </SoftBox>
            </SoftBox>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

function logTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('fatal') || t.includes('error') || t === 'error') return 'error.main';
  if (t.includes('warning')) return 'warning.main';
  if (t.includes('deprecated') || t.includes('notice')) return 'info.main';
  return 'text.secondary';
}

function extractPluginSlugFromPath(filePath: string | null): string | null {
  if (!filePath || !filePath.includes('plugins/')) return null;
  const m = filePath.match(/plugins\/([^/]+)/);
  return m ? m[1] : null;
}

interface ErrorLogRowProps {
  entry: ParsedErrorLogEntry;
  onRollbackPlugin?: (slug: string) => void;
  rollbackLoading?: boolean;
}

const ErrorLogRow: React.FC<ErrorLogRowProps> = ({ entry, onRollbackPlugin, rollbackLoading }) => {
  const [open, setOpen] = useState(false);
  const fileLine = entry.file != null && entry.line != null ? `${entry.file}:${entry.line}` : entry.file ?? '—';
  const pluginSlug = extractPluginSlugFromPath(entry.file);

  return (
    <>
      <TableRow
        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
        onClick={() => setOpen((o) => !o)}
      >
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{entry.timestamp || '—'}</SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ fontSize: '0.75rem', fontWeight: 600, color: logTypeColor(entry.logType) }}>
            {entry.logType || '—'}
          </SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftTypography
            component="span"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              whiteSpace: 'normal',
              wordBreak: 'break-all',
              display: 'block',
              lineHeight: 1.4,
            }}
          >
            {fileLine}
          </SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftBox
            component="span"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            sx={{ display: 'inline-flex', width: 56, justifyContent: 'center' }}
          >
            {pluginSlug && onRollbackPlugin && (
              <Tooltip title={`Deactivate plugin: ${pluginSlug}`} placement="left">
                <IconButton
                  size="small"
                  onClick={() => onRollbackPlugin(pluginSlug)}
                  disabled={rollbackLoading}
                  aria-label={`Deactivate ${pluginSlug}`}
                  sx={iconButtonOnLightSurfaceSx}
                >
                  <Icon sx={{ fontSize: 18 }}>power_off</Icon>
                </IconButton>
              </Tooltip>
            )}
          </SoftBox>
        </DataTableBodyCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} sx={{ py: 0, borderBottom: open ? '1px solid' : 0, borderColor: 'divider' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <SoftBox sx={{ py: 1.5, px: 2, bgcolor: 'grey.50' }}>
              <SoftTypography variant="caption" fontWeight="bold" color="textSecondary" display="block" sx={{ mb: 0.5 }}>Message</SoftTypography>
              <SoftBox component="pre" sx={{ m: 0, p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', maxHeight: 280, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {entry.message || '—'}
              </SoftBox>
            </SoftBox>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

function ErrorLogsPanel({ siteId, siteEnabled }: { siteId: string; siteEnabled?: boolean }) {
  const { data, isLoading, isError, error, refetch } = useSiteErrorLog(siteId, { enabled: siteEnabled });
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [fatalRecoveryLog, setFatalRecoveryLog] = useState<any>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  /**
   * Executes an emergency action via the Appwrite recovery-manager function (JWT based)
   */
  const handleRecoveryAction = async (action: 'get_error_log' | 'rollback_plugin', pluginSlug?: string) => {
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      // Roep de Appwrite function aan die we hebben gemaakt voor JWT herstel
      const execution = await functions.createExecution(
        'recovery-manager', // Ensure this ID matches your Appwrite Function ID
        JSON.stringify({ siteId, action, plugin_slug: pluginSlug }),
        false,
        '/',
        'POST' as Parameters<typeof functions.createExecution>[4]
      );

      const result = JSON.parse(execution.responseBody);
      if (!result.success) throw new Error(result.message || 'Action failed');

      if (action === 'get_error_log') {
        setFatalRecoveryLog(result.data.data);
      } else {
        alert('Plugin succesvol gedeactiveerd. De site zou nu weer bereikbaar moeten zijn.');
        setFatalRecoveryLog(null);
        refetch();
      }
    } catch (err: any) {
      setRecoveryError(err.message || 'Could not execute recovery action.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SoftBox display="flex" justifyContent="center" alignItems="center" p={6}>
        <Icon sx={{ fontSize: 40, color: 'grey.400', mr: 2 }}>sync</Icon>
        <SoftTypography variant="body2" color="textSecondary">Error log laden...</SoftTypography>
      </SoftBox>
    );
  }

  // Als de reguliere API faalt (500 error op WP), toon de Noodherstel optie
  if (isError) {
    return (
      <SoftBox p={3}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <SoftTypography variant="body2">
            <strong>The WordPress site appears unreachable (Fatal Error).</strong> <br />
            The standard error logs cannot be retrieved via the Bridge API.
            Use the Emergency Recovery agent to fetch the latest PHP crash data.
          </SoftTypography>
          <SoftBox mt={2}>
            <SoftButton 
              color="error" 
              variant="contained" 
              size="small" 
              onClick={() => handleRecoveryAction('get_error_log')}
              disabled={recoveryLoading}
            >
              {recoveryLoading ? <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} /> : <Icon sx={{ mr: 1 }}>emergency</Icon>}
              Scan op Fatal Errors (JWT)
            </SoftButton>
          </SoftBox>
        </Alert>

        {fatalRecoveryLog && (
          <Card sx={{ p: 2, bgcolor: 'grey.100', border: '1px solid', borderColor: 'error.light', mb: 2 }}>
            <SoftTypography variant="h6" color="error">Gevonden Fatal Error:</SoftTypography>
            <SoftTypography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1, display: 'block', p: 1, bgcolor: 'white', borderRadius: 1 }}>
              {JSON.stringify(fatalRecoveryLog, null, 2)}
            </SoftTypography>
            
            {/* Slimme detectie van de plugin slug uit het bestandspad */}
            {fatalRecoveryLog.file && fatalRecoveryLog.file.includes('plugins/') && (
              <SoftBox mt={2}>
                <SoftTypography variant="body2" sx={{ mb: 1 }}>Mogelijke oorzaak: Plugin gedetecteerd.</SoftTypography>
                <SoftButton 
                  color="warning" 
                  variant="gradient"
                  onClick={() => {
                    const parts = fatalRecoveryLog.file.split('plugins/');
                    const slug = parts[1].split('/')[0];
                    handleRecoveryAction('rollback_plugin', slug);
                  }}
                >
                  Deactivate Plugin: {fatalRecoveryLog.file.split('plugins/')[1].split('/')[0]}
                </SoftButton>
              </SoftBox>
            )}
          </Card>
        )}

        {recoveryError && <SoftTypography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>{recoveryError}</SoftTypography>}

        <SoftBox display="flex" alignItems="flex-start" gap={2} mt={3}>
          <Icon color="error" sx={{ mt: 0.5 }}>error</Icon>
          <SoftBox flex={1}>
            <SoftTypography variant="h6" fontWeight="medium" color="error" sx={{ mb: 1 }}>Error loading regular error log</SoftTypography>
            <SoftTypography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>{error?.message || String(error)}</SoftTypography>
            <SoftButton variant="outlined" color="info" size="small" onClick={() => refetch()}>Try again</SoftButton>
          </SoftBox>
        </SoftBox>
      </SoftBox>
    );
  }

  const rawLines = data?.lines ?? [];
  const bridgeLines = rawLines.filter((line) => line.includes('[WPHubPro Bridge] log_action:'));
  const bridgeEntries = parseBridgeLogLines(bridgeLines);
  const lines = rawLines.filter((line) => !line.includes('[WPHubPro Bridge]'));
  const fileInfo = data?.file ?? null;
  const errorMsg = data?.error;
  const parsed = parseErrorLogLines(lines).filter(
    (entry) => entry.logType.toLowerCase().includes('error')
  );

  return (
    <>
      <SoftBox p={2} sx={{ borderBottom: '1px solid', borderColor: 'grey.200' }}>
        <SoftTypography variant="caption" color="textSecondary" display="block">
          Last 200 lines of the PHP error log (error type only). Click a row to show the message.
        </SoftTypography>
        {fileInfo && (
          <SoftTypography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5, fontFamily: 'monospace' }}>
            Bestand: {fileInfo}
          </SoftTypography>
        )}
        {errorMsg && (
          <SoftTypography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>{errorMsg}</SoftTypography>
        )}
      </SoftBox>
      {bridgeEntries.length > 0 && (
        <SoftBox sx={{ borderBottom: '1px solid', borderColor: 'grey.200' }}>
          <SoftBox px={2} py={1.5}>
            <SoftTypography variant="caption" fontWeight="bold" color="secondary" display="block" sx={{ mb: 0.5 }}>
              Bridge activity (from site PHP log)
            </SoftTypography>
            <SoftTypography variant="caption" display="block" sx={{ mb: 1, color: 'text.secondary' }}>
              Parsed <code style={{ fontSize: '0.7rem' }}>log_action</code> lines — click a row for full JSON (secrets shortened).
            </SoftTypography>
            <ScrollableTableWrapper maxHeight="min(40vh, 280px)">
              <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                <SoftBox component="thead">
                  <TableRow>
                    <DataTableHeadCell width="22%" pl={2} color="#4F5482">
                      Time (UTC)
                    </DataTableHeadCell>
                    <DataTableHeadCell width="48%" pl={undefined} color="#4F5482">
                      Site · endpoint
                    </DataTableHeadCell>
                    <DataTableHeadCell width="30%" pl={undefined} color="#4F5482">
                      Result
                    </DataTableHeadCell>
                  </TableRow>
                </SoftBox>
                <TableBody>
                  {bridgeEntries.map((entry, i) => (
                    <BridgePhpLogRow key={`${entry.timestamp}-${i}`} entry={entry} />
                  ))}
                </TableBody>
              </Table>
            </ScrollableTableWrapper>
          </SoftBox>
        </SoftBox>
      )}
      {parsed.length === 0 ? (
        <SoftBox p={3}>
          <SoftTypography variant="body2" color="textSecondary">No lines or log not readable.</SoftTypography>
        </SoftBox>
      ) : (
        <ScrollableTableWrapper maxHeight="55vh">
          <Table
            size="small"
            stickyHeader
            sx={{
              tableLayout: 'fixed',
              width: '100%',
              '& thead th': {
                position: 'sticky',
                top: 0,
                zIndex: 2,
                backgroundColor: 'background.paper',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              },
              '& tbody td:first-of-type': {
                paddingLeft: (theme) => theme.spacing(5),
                paddingRight: (theme) => theme.spacing(3),
              },
              '& thead th:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
              '& tbody td:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
            }}
          >
            <SoftBox component="thead">
              <TableRow>
                <DataTableHeadCell width="20%" pl={5} color="#4F5482">Tijd</DataTableHeadCell>
                <DataTableHeadCell width="16%" pl={undefined} color="#4F5482">Type</DataTableHeadCell>
                <DataTableHeadCell width="54%" pl={undefined} color="#4F5482">Bestand:regel</DataTableHeadCell>
                <DataTableHeadCell width="10%" pl={undefined} color="#4F5482">Action</DataTableHeadCell>
              </TableRow>
            </SoftBox>
            <TableBody>
              {parsed.map((entry, i) => (
                <ErrorLogRow
                  key={i}
                  entry={entry}
                  onRollbackPlugin={(slug) => handleRecoveryAction('rollback_plugin', slug)}
                  rollbackLoading={recoveryLoading}
                />
              ))}
            </TableBody>
          </Table>
        </ScrollableTableWrapper>
      )}
    </>
  );
}

interface OutgoingLogEntry {
  time: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration?: number;
  request?: string;
  response?: string;
}

const OutgoingLogRow: React.FC<{ entry: OutgoingLogEntry }> = ({ entry }) => {
  const [open, setOpen] = useState(false);
  const statusOk = entry.statusCode >= 200 && entry.statusCode < 300;
  const statusErr = entry.statusCode >= 400;
  const statusColor = statusOk ? 'success.main' : statusErr ? 'error.main' : 'text.primary';
  const hasDetails = !!(entry.request || entry.response);
  return (
    <>
      <TableRow sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => setOpen((o) => !o)}>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatTime(entry.time)}</SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ fontSize: '0.75rem' }}>{entry.method || 'GET'}</SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{decodeEndpoint(entry.endpoint)}</SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', color: statusColor }}>{entry.statusCode ?? '—'}</SoftTypography>
        </DataTableBodyCell>
        <DataTableBodyCell>
          <SoftTypography component="span" sx={{ fontSize: '0.75rem' }}>{typeof entry.duration === 'number' ? `${entry.duration}s` : '—'}</SoftTypography>
        </DataTableBodyCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0, borderBottom: open ? '1px solid' : 0, borderColor: 'divider' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <SoftBox sx={{ py: 1.5, px: 2, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {entry.request && (
                <>
                  <SoftTypography variant="caption" fontWeight="bold" color="textSecondary">Request (formatted)</SoftTypography>
                  <SoftBox component="pre" sx={preLogSx}>
                    {formatLogDetailBlock(entry.request)}
                  </SoftBox>
                </>
              )}
              {entry.response && (
                <>
                  <SoftTypography variant="caption" fontWeight="bold" color="textSecondary">Response (formatted)</SoftTypography>
                  <SoftBox component="pre" sx={preLogSx}>
                    {formatLogDetailBlock(entry.response)}
                  </SoftBox>
                </>
              )}
              {!hasDetails && (
                <SoftTypography variant="caption" color="textSecondary">No request/response details (older logs).</SoftTypography>
              )}
            </SoftBox>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

function ExecutionLogsPanel({ siteId, siteEnabled }: { siteId: string; siteEnabled?: boolean }) {
  const { data: site } = useSite(siteId);
  const list = (site?.logData?.outgoing ?? []).slice().reverse();

  return (
    <>
      <SoftBox p={2} sx={{ borderBottom: '1px solid', borderColor: 'grey.200' }}>
        <SoftTypography variant="caption" color="textSecondary">
          OUTGOING: Calls to the bridge plugin API (plugin/theme actions).
        </SoftTypography>
      </SoftBox>
      {list.length === 0 ? (
        <SoftBox p={3}>
          <SoftTypography variant="body2" color="textSecondary">No outgoing logs yet.</SoftTypography>
        </SoftBox>
      ) : (
        <ScrollableTableWrapper maxHeight="55vh">
          <Table
            size="small"
            stickyHeader
            sx={{
              tableLayout: 'fixed',
              width: '100%',
              '& thead th': {
                position: 'sticky',
                top: 0,
                zIndex: 2,
                backgroundColor: 'background.paper',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              },
              '& tbody td:first-of-type': { paddingLeft: (theme) => theme.spacing(5), paddingRight: (theme) => theme.spacing(3) },
              '& thead th:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
              '& tbody td:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
            }}
          >
            <SoftBox component="thead">
              <TableRow>
                <DataTableHeadCell width="18%" pl={5} color="#4F5482">Tijd</DataTableHeadCell>
                <DataTableHeadCell width="8%" pl={undefined} color="#4F5482">Method</DataTableHeadCell>
                <DataTableHeadCell width="42%" pl={undefined} color="#4F5482">Endpoint</DataTableHeadCell>
                <DataTableHeadCell width="10%" pl={undefined} color="#4F5482">Code</DataTableHeadCell>
                <DataTableHeadCell width="14%" pl={undefined} color="#4F5482">Duur</DataTableHeadCell>
              </TableRow>
            </SoftBox>
            <TableBody>
              {list.map((entry, i) => (
                <OutgoingLogRow key={i} entry={entry} />
              ))}
            </TableBody>
          </Table>
        </ScrollableTableWrapper>
      )}
    </>
  );
}

const LogsTab: React.FC<LogsTabProps> = ({ siteId }) => {
  const [subTab, setSubTab] = useState(0);
  const { data: site } = useSite(siteId);
  useWordPress();
  const siteEnabled = site?.enabled !== false;

  return (
    <Card>
      <Tabs
        value={subTab}
        onChange={(_, v) => setSubTab(v)}
        sx={{
          px: 1,
          minHeight: 36,
          border: 'none',
          backgroundColor: 'transparent !important',
          '& .MuiTabs-scroller': { backgroundColor: 'transparent !important' },
          '& .MuiTabs-flexContainer': { justifyContent: 'flex-end', backgroundColor: 'transparent !important' },
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            fontSize: '0.75rem',
            fontWeight: 700,
            minHeight: 36,
            textTransform: 'none',
            backgroundColor: 'transparent !important',
            borderRadius: 0,
          },
          '& .MuiTab-root:hover': { backgroundColor: 'transparent !important', borderRadius: 0 },
          '& .MuiTab-root.Mui-selected': { color: '#ed6c02 !important', backgroundColor: 'transparent !important', borderRadius: 0 },
          '& .MuiTab-root.Mui-focusVisible': { backgroundColor: 'transparent !important', borderRadius: 0 },
        }}
      >
        <Tab label="INCOMING" id="logs-incoming" aria-controls="logs-panel-incoming" />
        <Tab label="Heartbeat" id="logs-heartbeat" aria-controls="logs-panel-heartbeat" />
        <Tab label="OUTGOING" id="logs-outgoing" aria-controls="logs-panel-outgoing" />
        <Tab label="Error Logs" id="logs-error" aria-controls="logs-panel-error" />
      </Tabs>
      <SoftBox
        role="tabpanel"
        id="logs-panel-incoming"
        aria-labelledby="logs-incoming"
        hidden={subTab !== 0}
        sx={{
          height: '55vh',
          overflow: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {subTab === 0 && <IncomingLogsPanel siteId={siteId} siteEnabled={siteEnabled} />}
      </SoftBox>
      <SoftBox
        role="tabpanel"
        id="logs-panel-heartbeat"
        aria-labelledby="logs-heartbeat"
        hidden={subTab !== 1}
        sx={{
          height: '55vh',
          overflow: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {subTab === 1 && <HeartbeatLogsPanel siteId={siteId} siteEnabled={siteEnabled} />}
      </SoftBox>
      <SoftBox
        role="tabpanel"
        id="logs-panel-outgoing"
        aria-labelledby="logs-outgoing"
        hidden={subTab !== 2}
        sx={{
          height: '55vh',
          overflow: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {subTab === 2 && <ExecutionLogsPanel siteId={siteId} siteEnabled={siteEnabled} />}
      </SoftBox>
      <SoftBox
        role="tabpanel"
        id="logs-panel-error"
        aria-labelledby="logs-error"
        hidden={subTab !== 3}
        sx={{
          height: '55vh',
          overflow: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {subTab === 3 && <ErrorLogsPanel siteId={siteId} siteEnabled={siteEnabled} />}
      </SoftBox>
    </Card>
  );
};

export default LogsTab;