type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

let currentLevel: LogLevel = 'info';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function formatMessage(level: LogLevel, ...args: unknown[]): string {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return `${prefix} ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`;
}

export const logger = {
  setLogLevel(level: LogLevel) {
    currentLevel = level;
  },
  debug(...args: unknown[]) {
    if (levels[currentLevel] <= levels.debug) {
      console.debug(formatMessage('debug', ...args));
    }
  },
  info(...args: unknown[]) {
    if (levels[currentLevel] <= levels.info) {
      console.info(formatMessage('info', ...args));
    }
  },
  warn(...args: unknown[]) {
    if (levels[currentLevel] <= levels.warn) {
      console.warn(formatMessage('warn', ...args));
    }
  },
  error(...args: unknown[]) {
    if (levels[currentLevel] <= levels.error) {
      console.error(formatMessage('error', ...args));
    }
  },
};
