import { EventEmitter } from "events";
import Redis from "ioredis";
import { config } from "../../config/env.js";
import { isRedisAvailable } from "../../config/redis.js";
import logger from "../../utils/logger.js";
import { createEvent, EVENT_TYPES } from "./eventContract.js";

class RealtimeEventBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(200); // Allow multiple concurrent SSE client connections

    this.redisPub = null;
    this.redisSub = null;
    this.useRedis = false;
    this.subscribersCount = new Map(); // taskId -> count

    this._initRedisPubSub();
  }

  _initRedisPubSub() {
    // Only attempt Redis PubSub if Redis is configured
    if (!config.redis.host && !config.redis.url) {
      return;
    }

    try {
      const redisOptions = {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        connectTimeout: 2000
      };

      const createClient = () => {
        if (config.redis.url) {
          return new Redis(config.redis.url, redisOptions);
        }
        return new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password || undefined,
          tls: config.redis.tls ? {} : undefined,
          ...redisOptions
        });
      };

      this.redisPub = createClient();
      this.redisSub = createClient();

      this.redisSub.on("message", (channel, message) => {
        try {
          const event = JSON.parse(message);
          const taskId = channel.replace("devra:events:task:", "");
          this.emitter.emit(`task:${taskId}`, event);
          this.emitter.emit("all", { channel, event });
        } catch (err) {
          logger.debug(`[EventBus] Error parsing Redis PubSub message: ${err.message}`);
        }
      });

      this.redisPub.on("connect", () => {
        this.useRedis = true;
        logger.info("[EventBus] Redis Pub/Sub publisher connected for multi-instance realtime streaming.");
      });

      this.redisSub.on("connect", () => {
        this.redisSub.psubscribe("devra:events:task:*", () => {
          logger.info("[EventBus] Subscribed to pattern 'devra:events:task:*'");
        });
      });

      this.redisPub.on("error", () => {
        this.useRedis = false;
      });

      this.redisSub.on("error", () => {
        this.useRedis = false;
      });

      // Trigger lazy connect
      this.redisPub.connect().catch(() => {});
      this.redisSub.connect().catch(() => {});
    } catch (err) {
      logger.warn(`[EventBus] Redis Pub/Sub initialization notice: ${err.message}. Operating in memory mode.`);
      this.useRedis = false;
    }
  }

  /**
   * Publishes an event for a specific task
   * @param {string} taskId - Target task/session identifier
   * @param {Object} event - Event object (or event config passed to createEvent)
   */
  async publishTaskEvent(taskId, event) {
    if (!taskId) return;

    const eventObj = event.id && event.type ? event : createEvent({ taskId, ...event });
    const channel = `devra:events:task:${taskId}`;

    // 1. Emit to local in-memory listeners
    this.emitter.emit(`task:${taskId}`, eventObj);
    this.emitter.emit("all", { channel, event: eventObj });

    // 2. Publish to Redis PubSub for multi-instance broadcast if available
    if (this.useRedis && this.redisPub && this.redisPub.status === "ready") {
      try {
        await this.redisPub.publish(channel, JSON.stringify(eventObj));
      } catch (err) {
        logger.debug(`[EventBus] Redis publish error: ${err.message}`);
      }
    }

    return eventObj;
  }

  /**
   * Subscribes a listener to events for a specific task
   * @param {string} taskId - Target task identifier
   * @param {Function} handler - Event callback function (event: Object) => void
   * @returns {Function} Unsubscribe function
   */
  subscribeTask(taskId, handler) {
    if (!taskId || typeof handler !== "function") {
      return () => {};
    }

    const eventName = `task:${taskId}`;
    this.emitter.on(eventName, handler);

    const count = (this.subscribersCount.get(taskId) || 0) + 1;
    this.subscribersCount.set(taskId, count);

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      this.emitter.removeListener(eventName, handler);
      const remaining = (this.subscribersCount.get(taskId) || 1) - 1;
      if (remaining <= 0) {
        this.subscribersCount.delete(taskId);
      } else {
        this.subscribersCount.set(taskId, remaining);
      }
    };
  }

  /**
   * Removes all listeners for a task
   */
  cleanupTask(taskId) {
    if (!taskId) return;
    this.emitter.removeAllListeners(`task:${taskId}`);
    this.subscribersCount.delete(taskId);
  }

  /**
   * Health check reporting status of the EventBus
   */
  healthCheck() {
    return {
      type: "realtime-eventbus",
      mode: this.useRedis ? "redis-pubsub" : "in-memory",
      activeTaskSubscriptions: this.subscribersCount.size,
      totalListeners: this.emitter.eventNames().length
    };
  }

  /**
   * Graceful shutdown closing Redis PubSub connections
   */
  async close() {
    this.emitter.removeAllListeners();
    if (this.redisPub) {
      try { await this.redisPub.quit(); } catch (_) { this.redisPub.disconnect(); }
    }
    if (this.redisSub) {
      try { await this.redisSub.quit(); } catch (_) { this.redisSub.disconnect(); }
    }
    this.useRedis = false;
  }
}

export const eventBus = new RealtimeEventBus();
export default eventBus;
