import { config } from '../config/index.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'jwt',
  'authorization',
  'secret',
  'internalapikey'
]);

function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitize(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function formatLog(level, message, meta = {}) {
  const logObject = {
    timestamp: new Date().toISOString(),
    level,
    service: config.serviceName,
    message,
    ...sanitize(meta)
  };

  if (config.env === 'development') {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(sanitize(meta))}` : '';
    return `[${logObject.timestamp}] [${level.toUpperCase()}] [${config.serviceName}] ${message}${metaStr}`;
  }

  return JSON.stringify(logObject);
}

export const logger = {
  info: (message, meta) => console.log(formatLog('info', message, meta)),
  warn: (message, meta) => console.warn(formatLog('warn', message, meta)),
  error: (message, meta) => console.error(formatLog('error', message, meta)),
  debug: (message, meta) => {
    if (config.env !== 'production') {
      console.debug(formatLog('debug', message, meta));
    }
  }
};
