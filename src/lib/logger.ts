export type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, payload?: unknown): void {
  const time = new Date().toISOString();
  if (payload) {
    console[level === 'info' ? 'log' : level](`[${time}] [${level.toUpperCase()}] ${message}`, payload);
    return;
  }
  console[level === 'info' ? 'log' : level](`[${time}] [${level.toUpperCase()}] ${message}`);
}

export const logger = {
  info: (message: string, payload?: unknown) => log('info', message, payload),
  warn: (message: string, payload?: unknown) => log('warn', message, payload),
  error: (message: string, payload?: unknown) => log('error', message, payload)
};
