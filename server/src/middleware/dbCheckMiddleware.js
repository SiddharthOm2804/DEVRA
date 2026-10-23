import mongoose from "mongoose";

/**
 * Middleware ensuring MongoDB is actively connected before processing stateful requests
 */
export const requireDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database service unavailable. MongoDB connection is not active.",
      error: "DATABASE_UNAVAILABLE"
    });
  }
  next();
};
