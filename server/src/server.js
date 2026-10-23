import app from "./app.js";
import { config, validateProductionSecrets } from "./config/env.js";
import { connectDB } from "./config/db.js";
import logger from "./utils/logger.js";
import { initOpenTelemetry, shutdownOpenTelemetry } from "./metrics/opentelemetry.js";

// Initialize OpenTelemetry SDK if enabled
initOpenTelemetry();

const startServer = async () => {
  // Validate security configuration before connecting or listening
  validateProductionSecrets(config);

  // Connect to database
  await connectDB();

  // Create HTTP server instance
  const server = app.listen(config.port, () => {
    logger.info(`[DevPilot Server] Started successfully on port ${config.port} (${config.nodeEnv})`);
    logger.info(`[DevPilot Server] Health check available at: http://localhost:${config.port}/api/health`);
    logger.info(`[DevPilot Server] Metrics available at: http://localhost:${config.port}/metrics`);
  });

  // Handle server startup errors (e.g. EADDRINUSE)
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.error(`[DevPilot Server] Port ${config.port} is already in use by another process.`);
      logger.error(`[DevPilot Server] Diagnostic: Check processes using port ${config.port} or change PORT in server/.env or .env.`);
    } else {
      logger.error(`[DevPilot Server] Failed to start server: ${err.message}`);
    }
    process.exit(1);
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info("[DevPilot Server] Gracefully shutting down...");
    try {
      await shutdownOpenTelemetry();
    } catch (e) {
      // ignore telemetry shutdown error on exit
    }
    server.close(() => {
      logger.info("[DevPilot Server] HTTP server closed.");
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

startServer();
