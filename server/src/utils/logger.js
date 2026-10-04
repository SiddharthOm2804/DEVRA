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

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaString = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level}] ${message}${metaString}`;
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
