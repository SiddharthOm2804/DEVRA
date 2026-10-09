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

export default router;
