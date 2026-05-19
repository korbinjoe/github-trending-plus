export interface IngestLogger {
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

export const defaultIngestLogger: IngestLogger = {
  info: (msg, meta) => {
    const ts = new Date().toISOString();
    if (meta && Object.keys(meta).length > 0) {
      console.log(`[${ts}] ${msg}`, meta);
    } else {
      console.log(`[${ts}] ${msg}`);
    }
  },
  warn: (msg, meta) => {
    const ts = new Date().toISOString();
    if (meta && Object.keys(meta).length > 0) {
      console.warn(`[${ts}] ${msg}`, meta);
    } else {
      console.warn(`[${ts}] ${msg}`);
    }
  },
  error: (msg, meta) => {
    const ts = new Date().toISOString();
    if (meta && Object.keys(meta).length > 0) {
      console.error(`[${ts}] ${msg}`, meta);
    } else {
      console.error(`[${ts}] ${msg}`);
    }
  },
};

/** Log every `step` items when `current` advances (1-based). */
export function logEvery(
  logger: IngestLogger,
  msg: string,
  current: number,
  total: number,
  step: number,
  meta?: Record<string, unknown>,
): void {
  if (current === 1 || current === total || current % step === 0) {
    logger.info(msg, { ...meta, current, total, pct: Math.round((current / total) * 100) });
  }
}
