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
import { notFoundHandler, errorHandler } from "./middleware/errorMiddleware.js";
import { apiLimiter, authLimiter, aiLimiter } from "./middleware/rateLimiter.js";
import { config } from "./config/env.js";

const app = express();

// Security Middlewares: Helmet with Cross-Origin Resource Policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// CORS Configuration: Supports Web Client, Local Dev, and VS Code Extension
const allowedOrigins = [
  config.clientUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., VS Code extension, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, or fallback to allowed
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
  })
);

// HTTP Request Logger
if (config.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// Body Parsing Middlewares with safe size boundaries
app.use(express.json({ limit: "10mb" }));
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

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
