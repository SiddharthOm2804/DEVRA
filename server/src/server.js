import app from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import logger from "./utils/logger.js";
import { initOpenTelemetry, shutdownOpenTelemetry } from "./metrics/opentelemetry.js";

// Initialize OpenTelemetry SDK if enabled
initOpenTelemetry();

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Start HTTP listener
  const server = app.listen(config.port, () => {
    logger.info(`[DevPilot Server] Started successfully on port ${config.port} (${config.nodeEnv})`);
    logger.info(`[DevPilot Server] Health check available at: http://localhost:${config.port}/api/health`);
    logger.info(`[DevPilot Server] Metrics available at: http://localhost:${config.port}/metrics`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    logger.info("[DevPilot Server] Gracefully shutting down...");
    await shutdownOpenTelemetry();
    server.close(() => {
      logger.info("[DevPilot Server] HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer();
