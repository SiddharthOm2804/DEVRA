import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import repositoryRoutes from "./routes/repositoryRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorMiddleware.js";
import { apiLimiter, authLimiter, aiLimiter } from "./middleware/rateLimiter.js";
import { metricsMiddleware, metricsHandler } from "./middleware/metricsMiddleware.js";
import { config } from "./config/env.js";

const app = express();

// Trust reverse proxy (e.g. Nginx in Docker Compose) for accurate client IP resolution & rate limiting
app.set("trust proxy", 1);

// Metrics collection middleware (registered early to capture all inbound requests)
app.use(metricsMiddleware);

// Security Middlewares: Helmet with Cross-Origin Resource Policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Helper to normalize origin strings for consistent comparison (strips trailing slashes, default ports :80 and :443)
export const normalizeOrigin = (urlStr) => {
  if (!urlStr || typeof urlStr !== "string") return "";
  try {
    const parsed = new URL(urlStr);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    let port = parsed.port;
    if ((protocol === "http:" && port === "80") || (protocol === "https:" && port === "443")) {
      port = "";
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  } catch {
    // If not a parseable URL, strip trailing slash and default ports via regex
    return urlStr.trim().replace(/\/+$/, "").replace(/:(80|443)$/, "");
  }
};

// CORS Configuration: Supports Web Client, Local Dev, and VS Code Extension
export const defaultAllowedOrigins = [
  config.clientUrl,
  "http://localhost",
  "http://localhost:80",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5001",
  "http://127.0.0.1:5001"
].filter(Boolean);

export const corsOriginHandler = (allowedOrigins = defaultAllowedOrigins, isProduction = config.isProduction) => {
  return (origin, callback) => {
    // Requests with no origin (VS Code extension, curl, server-to-server) are allowed
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    const isAllowed = allowedOrigins.some((allowed) => {
      const normalizedAllowed = normalizeOrigin(allowed);
      return allowed === origin || normalizedAllowed === normalizedOrigin;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    // In non-production only, permit arbitrary localhost and 127.0.0.1 ports
    if (
      !isProduction &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)
    ) {
      return callback(null, true);
    }

    // In production, reject unapproved origins strictly (including unapproved localhost)
    if (isProduction) {
      return callback(new Error("Not allowed by CORS"));
    }

    // In non-production/development only allow if explicitly matched, or block CORS headers
    return callback(null, false);
  };
};

app.use(
  cors({
    origin: corsOriginHandler(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
  })
);

// HTTP Request Logger with URL credential redaction
morgan.token("sanitized-url", (req) => {
  const url = req.originalUrl || req.url;
  return url.replace(/([?&](?:token|oauth_token|ticket|code)=)[^&]+/gi, "$1[REDACTED]");
});

if (config.nodeEnv !== "test") {
  app.use(morgan(":method :sanitized-url :status :res[content-length] - :response-time ms"));
}

// Body Parsing Middlewares with safe size boundaries and rawBody capture for webhooks
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Root Information Endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Devra / DevPilot API Server",
    status: "online",
    healthCheck: "/api/health",
    version: "0.1.0"
  });
});

// Prometheus Scrape Endpoint (supports optional Bearer token auth via METRICS_AUTH_TOKEN)
app.get("/metrics", metricsHandler);

// General API Rate Limiting
app.use("/api", apiLimiter);

// Specific Rate Limiters for Sensitive Operations
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/reviews", aiLimiter);
app.use("/api/chat", aiLimiter);
app.use("/api/agent", aiLimiter);

// API Route Mounts
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/repositories", repositoryRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/webhooks", webhookRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
