import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment file loading strategy:
// 1. Load server/.env first for local server overrides.
// 2. Load root .env to supply monorepo-wide configurations (e.g. GitHub credentials, API keys) when not set in server/.env.
const serverEnvPath = path.resolve(__dirname, "../../.env");
const rootEnvPath = path.resolve(__dirname, "../../../.env");

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  // Read root .env and only apply variables that are either undefined or empty string in process.env
  const rootEnvConfig = dotenv.parse(fs.readFileSync(rootEnvPath));
  for (const [key, val] of Object.entries(rootEnvConfig)) {
    if (!process.env[key] || process.env[key].trim() === "") {
      process.env[key] = val;
    }
  }
}
dotenv.config();

// Port validation helper
const parsePort = (rawPort, fallback = 5001) => {
  const parsed = parseInt(rawPort, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(`[Env] Invalid PORT value '${rawPort}'. Falling back to default port ${fallback}.`);
    return fallback;
  }
  return parsed;
};

export const config = {
  port: parsePort(process.env.PORT, 5001),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/devra"
  },
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev_jwt_secret_local_only_not_for_prod"),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    callbackUrl: process.env.GITHUB_CALLBACK_URL || "http://localhost:5001/api/auth/github/callback",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev_webhook_secret_local_only")
  },
  ai: {
    provider: process.env.AI_PROVIDER || "gemini",
    apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "",
    model: process.env.AI_MODEL || "gemini-1.5-pro",
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "4096", 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.2")
  },
  redis: {
    url: process.env.REDIS_URL || "",
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "",
    tls: process.env.REDIS_TLS === "true"
  },
  rag: {
    vectorStore: (process.env.VECTOR_STORE || "redis").toLowerCase(),
    vectorDimension: parseInt(process.env.VECTOR_DIMENSION || "128", 10),
    indexName: process.env.REDIS_INDEX_NAME || "devra:idx:codebase",
    keyPrefix: process.env.REDIS_DOC_PREFIX || "devra:doc:",
    distanceMetric: process.env.REDIS_DISTANCE_METRIC || "COSINE"
  }
};

/**
 * List of known insecure placeholder strings that must never be permitted in production
 */
export const INSECURE_PLACEHOLDER_SECRETS = [
  "default_fallback_change_me_in_prod",
  "devra_webhook_secret_default_2026",
  "dev_jwt_secret_local_only_not_for_prod",
  "dev_webhook_secret_local_only",
  "secret",
  "changeme",
  "change_me",
  "123456",
  "password"
];

/**
 * Validates that required security secrets are present, strong, and not known defaults.
 * Throws a fatal descriptive error if invalid in production.
 * @param {Object} envConfig - Configuration object or process.env overrides
 * @returns {boolean} true if valid
 */
export function validateProductionSecrets(envConfig = config) {
  const isProd = envConfig.isProduction || envConfig.nodeEnv === "production" || process.env.NODE_ENV === "production";
  if (!isProd) {
    return true;
  }

  const errors = [];

  // 1. JWT_SECRET validation
  const jwtSecret = envConfig.jwt ? envConfig.jwt.secret : (process.env.JWT_SECRET || "");
  if (!jwtSecret || jwtSecret.trim() === "") {
    errors.push("JWT_SECRET environment variable is missing or empty.");
  } else if (INSECURE_PLACEHOLDER_SECRETS.includes(jwtSecret.trim().toLowerCase())) {
    errors.push("JWT_SECRET matches a known insecure placeholder. Provide a unique, high-entropy secret.");
  } else if (jwtSecret.trim().length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters long in production.");
  }

  // 2. GITHUB_WEBHOOK_SECRET validation (required in production for webhook route integrity)
  const webhookSecret = envConfig.github ? envConfig.github.webhookSecret : (process.env.GITHUB_WEBHOOK_SECRET || "");
  if (!webhookSecret || webhookSecret.trim() === "") {
    errors.push("GITHUB_WEBHOOK_SECRET environment variable is missing or empty.");
  } else if (INSECURE_PLACEHOLDER_SECRETS.includes(webhookSecret.trim().toLowerCase())) {
    errors.push("GITHUB_WEBHOOK_SECRET matches a known insecure placeholder. Provide a unique, high-entropy secret.");
  } else if (webhookSecret.trim().length < 16) {
    errors.push("GITHUB_WEBHOOK_SECRET must be at least 16 characters long in production.");
  }

  if (errors.length > 0) {
    const errorMsg = `[Fatal Configuration Error] Production startup blocked due to missing or insecure secrets:\n` +
      errors.map((e) => `  - ${e}`).join("\n") +
      `\nSet valid secrets in environment variables before starting the server.`;
    throw new Error(errorMsg);
  }

  return true;
}
