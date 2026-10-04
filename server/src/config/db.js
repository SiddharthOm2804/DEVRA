import mongoose from "mongoose";
import { config } from "./env.js";
import logger from "../utils/logger.js";

/**
 * Connect to MongoDB database
 * Provides graceful fallback logging if MongoDB is not running during foundation phase
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 3000
    });
    logger.info(`[MongoDB] Database connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.warn(`[MongoDB] Notice: Could not connect to MongoDB at ${config.mongodb.uri}`);
    logger.warn(`[MongoDB] Details: ${error.message}`);
    logger.warn("[MongoDB] Server running in foundation/standalone mode (DB dependent features will be unavailable).");
    return null;
  }
};

export default connectDB;
