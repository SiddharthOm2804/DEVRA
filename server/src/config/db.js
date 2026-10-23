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
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    logger.info(`[MongoDB] Database connected successfully (host: ${conn.connection.host}, db: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    logger.warn(`[MongoDB] Notice: Could not connect to MongoDB database.`);
    logger.warn(`[MongoDB] Diagnostic: ${error.message}`);
    logger.warn("[MongoDB] If running locally, verify MongoDB service is running (e.g. net start MongoDB, mongod, or docker run -d -p 27017:27017 mongo).");
    logger.warn("[MongoDB] Authentication and data-persistence features will return 503 until database is available.");
    return null;
  }
};

export default connectDB;
