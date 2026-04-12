/**
 * Server-only — safe JSON body parsing for `/api/*` handlers (size cap).
 */

export const DEFAULT_MAX_JSON_BYTES = 512 * 1024;

export type ParseJsonBodyResult<T> = { ok: true; value: T } | { ok: false; message: string };

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function parseJsonBody<T = unknown>(
  raw: string | null | undefined,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): ParseJsonBodyResult<T> {
  if (raw == null || raw === '') return { ok: true, value: {} as T };
  const buf = utf8ByteLength(raw);
  if (buf > maxBytes) {
    return { ok: false, message: `JSON body too large (max ${maxBytes} bytes)` };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, message: 'Invalid JSON body' };
  }
}
