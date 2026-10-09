import Redis from "ioredis";
import { config } from "./env.js";
import logger from "../utils/logger.js";

let redisClient = null;
let isConnected = false;
let connectionAttempted = false;

/**
 * Returns the centralized Redis client instance.
 * Initializes the client lazily if not already created.
 */
export function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 1) {
        return null;
      }
      return null;
    },
    enableReadyCheck: true,
    connectTimeout: 2000
  };

  if (config.redis.url) {
    redisClient = new Redis(config.redis.url, redisOptions);
  } else {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      tls: config.redis.tls ? {} : undefined,
      ...redisOptions
    });
  }

  redisClient.on("connect", () => {
    isConnected = true;
    logger.info(`[Redis] Connected to Redis at ${config.redis.host}:${config.redis.port}`);
  });

  redisClient.on("ready", () => {
    isConnected = true;
    logger.info("[Redis] Client is ready for commands");
  });

  redisClient.on("error", (err) => {
    isConnected = false;
    // Log once as warning to prevent spamming logs in dev if Redis is optional
    if (!connectionAttempted) {
      logger.warn(`[Redis] Notice: Redis connection unavailable (${err.message})`);
    } else {
      logger.debug(`[Redis] Error: ${err.message}`);
    }
  });

  redisClient.on("close", () => {
    isConnected = false;
  });

  return redisClient;
}

/**
 * Initializes and tests the Redis connection
 */
export async function connectRedis() {
  connectionAttempted = true;
  const client = getRedisClient();
  try {
    if (client.status === "wait" || client.status === "close") {
      await client.connect();
    }
    await client.ping();
    isConnected = true;
    logger.info("[Redis] Connection verified successfully");
    return client;
  } catch (error) {
    isConnected = false;
    logger.warn(`[Redis] Could not connect to Redis at ${config.redis.host}:${config.redis.port} - ${error.message}`);
    return null;
  }
}

/**
 * Checks whether Redis is currently connected and responsive
 */
export function isRedisAvailable() {
  return isConnected && redisClient && redisClient.status === "ready";
}

/**
 * Closes the Redis connection gracefully
 */
export async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      isConnected = false;
      redisClient = null;
      logger.info("[Redis] Client disconnected gracefully");
    } catch (err) {
      if (redisClient) {
        redisClient.disconnect();
      }
      isConnected = false;
      redisClient = null;
    }
  }
}

export default {
  getRedisClient,
  connectRedis,
  isRedisAvailable,
  disconnectRedis
};
