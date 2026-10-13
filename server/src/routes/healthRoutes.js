import express from "express";
import mongoose from "mongoose";
import { getVectorStore } from "../services/vectorStore/index.js";

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    System health check endpoint
 * @access  Public
 */
router.get("/health", async (req, res) => {
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const dbState = mongoose.connection.readyState;

  let vectorStoreStatus = { status: "unknown" };
  try {
    const store = await getVectorStore();
    vectorStoreStatus = await store.healthCheck();
  } catch (err) {
    vectorStoreStatus = { healthy: false, error: err.message };
  }

  res.status(200).json({
    status: "ok",
    message: "Devra Server is running smoothly",
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(1)}s`,
    environment: process.env.NODE_ENV || "development",
    service: "devra-server",
    database: {
      status: dbStatusMap[dbState] || "unknown",
      readyState: dbState
    },
    vectorStore: vectorStoreStatus
  });
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe endpoint for Kubernetes / orchestration
 * @access  Public
 */
router.get("/health/ready", async (req, res) => {
  const checks = {
    mongodb: false,
    vectorStore: false
  };

  // 1. Fast MongoDB check via connection state (1 = connected)
  const isMongoReady = mongoose.connection.readyState === 1;
  checks.mongodb = isMongoReady;

  // 2. Vector store ping with 1000ms max timeout
  try {
    const store = await getVectorStore();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 1000)
    );
    const healthPromise = store.healthCheck();
    const storeHealth = await Promise.race([healthPromise, timeoutPromise]);
    checks.vectorStore = Boolean(storeHealth && storeHealth.healthy !== false && storeHealth.status !== "error");
  } catch (e) {
    checks.vectorStore = false;
  }

  const isReady = checks.mongodb; // MongoDB is mandatory; vectorStore is optional or soft requirement

  const statusCode = isReady ? 200 : 503;
  return res.status(statusCode).json({
    ready: isReady,
    status: isReady ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks
  });
});

export default router;
