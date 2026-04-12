/**
 * Server-only — structured logs for API handlers. Do not import from React.
 */

export type ApiLogLevel = 'info' | 'warn' | 'error' | 'debug';

export type ApiLogRecord = {
  level: ApiLogLevel;
  scope: string;
  msg: string;
  t: string;
  requestId?: string;
  [key: string]: unknown;
};

function emit(record: ApiLogRecord): void {
  const line = JSON.stringify(record);
  if (record.level === 'error') {
    console.error(line);
  } else if (record.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createApiLogger(scope: string, requestId?: string) {
  const base = { scope, ...(requestId ? { requestId } : {}) };

  return {
    info(msg: string, extra?: Record<string, unknown>) {
      emit({ level: 'info', msg, t: new Date().toISOString(), ...base, ...extra });
    },
    warn(msg: string, extra?: Record<string, unknown>) {
      emit({ level: 'warn', msg, t: new Date().toISOString(), ...base, ...extra });
    },
    error(msg: string, extra?: Record<string, unknown>) {
      emit({ level: 'error', msg, t: new Date().toISOString(), ...base, ...extra });
    },
    debug(msg: string, extra?: Record<string, unknown>) {
      emit({ level: 'debug', msg, t: new Date().toISOString(), ...base, ...extra });
    },
  };
}

export type ApiLogger = ReturnType<typeof createApiLogger>;
