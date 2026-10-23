/**
 * Production Structured Logger for DevPilot Server
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = process.env.NODE_ENV === "production" ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

const SENSITIVE_KEYS = new Set([
  "token",
  "accesstoken",
  "githubaccesstoken",
  "authorization",
  "password",
  "secret",
  "ticket",
  "code"
]);

function sanitizeData(data, depth = 0) {
  if (!data || depth > 4) return data;
  if (typeof data === "string") {
    // Redact JWT-like strings or bearer headers
    return data
      .replace(/Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*/gi, "Bearer [REDACTED]")
      .replace(/([?&](?:token|oauth_token|ticket|code)=)[^&]+/gi, "$1[REDACTED]");
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }
  if (typeof data === "object") {
    const sanitized = {};
    for (const [k, v] of Object.entries(data)) {
      const lower = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (SENSITIVE_KEYS.has(lower) || lower.includes("secret") || lower.includes("password") || lower.includes("token")) {
        sanitized[k] = "[REDACTED]";
      } else {
        sanitized[k] = sanitizeData(v, depth + 1);
      }
    }
    return sanitized;
  }
  return data;
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const safeMessage = typeof message === "string" ? sanitizeData(message) : message;
  const safeMeta = meta ? sanitizeData(meta) : meta;
  const metaString = safeMeta && Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : "";
  return `[${timestamp}] [${level}] ${safeMessage}${metaString}`;
}

export const logger = {
  debug: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage("DEBUG", message, meta));
    }
  },
  info: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.info(formatMessage("INFO", message, meta));
    }
  },
  warn: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatMessage("WARN", message, meta));
    }
  },
  error: (message, errorOrMeta) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      const isErrorObj = errorOrMeta instanceof Error;
      const meta = isErrorObj
        ? { message: errorOrMeta.message, stack: process.env.NODE_ENV === "production" ? undefined : errorOrMeta.stack }
        : errorOrMeta;
      console.error(formatMessage("ERROR", message, meta));
    }
  }
};

export default logger;
