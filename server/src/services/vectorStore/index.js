import { config } from "../../config/env.js";
import { MemoryVectorStore } from "./MemoryVectorStore.js";
import { RedisVectorStore } from "./RedisVectorStore.js";
import { isRedisAvailable, connectRedis } from "../../config/redis.js";
import logger from "../../utils/logger.js";

let activeVectorStore = null;

/**
 * Returns the active VectorStore instance based on configuration and availability
 * Provides seamless fallback to MemoryVectorStore if Redis is offline
 */
export async function getVectorStore() {
  if (activeVectorStore) {
    return activeVectorStore;
  }

  const preferredStore = (config.rag?.vectorStore || "redis").toLowerCase();

  if (preferredStore === "redis") {
    try {
      const redisConnected = await connectRedis();
      if (redisConnected) {
        const redisStore = new RedisVectorStore();
        await redisStore.initialize();
        activeVectorStore = redisStore;
        logger.info("[VectorStoreFactory] Initialized RedisVectorStore successfully.");
        return activeVectorStore;
      }
    } catch (err) {
      logger.warn(`[VectorStoreFactory] Redis vector store initialization notice: ${err.message}. Falling back to MemoryVectorStore.`);
    }

    logger.warn("[VectorStoreFactory] Redis is unavailable or unconfigured. Falling back to persistent in-memory vector store.");
  }

  // Fallback to in-memory vector store
  const memoryStore = new MemoryVectorStore();
  await memoryStore.initialize();
  activeVectorStore = memoryStore;
  return activeVectorStore;
}

/**
 * Explicitly sets the active vector store (useful for unit tests or dynamic reconfiguration)
 */
export function setVectorStore(storeInstance) {
  activeVectorStore = storeInstance;
}

/**
 * Resets the active vector store singleton
 */
export function resetVectorStore() {
  activeVectorStore = null;
}

export { VectorStore } from "./VectorStore.js";
export { MemoryVectorStore } from "./MemoryVectorStore.js";
export { RedisVectorStore } from "./RedisVectorStore.js";
export { MemoryVectorStore as MemoryStore } from "./MemoryVectorStore.js";
export { RedisVectorStore as RedisStore } from "./RedisVectorStore.js";

export default {
  getVectorStore,
  setVectorStore,
  resetVectorStore
};
