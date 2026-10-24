import crypto from "crypto";
import logger from "./logger.js";
import { getRedisClient, isRedisAvailable } from "../config/redis.js";

/**
 * Short-lived single-use ticket store for sensitive token exchange (OAuth callbacks & SSE stream tickets)
 * Prevents bearer JWT leakage in browser URLs, logs, and browser history.
 * Supports distributed atomic consumption via Redis with transparent in-memory fallback.
 */
class TicketStore {
  constructor(defaultTtlMs = 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
    this.tickets = new Map();

    // Periodic sweep for expired tickets (runs every minute for in-memory entries)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Create a single-use ticket for arbitrary payload data (e.g. JWT token or user/session binding)
   * Supports synchronous return for backward compatibility, while saving to Redis asynchronously if available.
   * @param {Object} payload 
   * @param {number} [ttlMs] 
   * @returns {string} ticket id
   */
  createTicket(payload, ttlMs = this.defaultTtlMs) {
    const ticketId = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    const entry = {
      payload,
      expiresAt: now + ttlMs,
      used: false
    };

    this.tickets.set(ticketId, entry);

    if (isRedisAvailable()) {
      try {
        const client = getRedisClient();
        const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
        client.setex(`devra:ticket:${ticketId}`, ttlSec, JSON.stringify(entry)).catch((err) => {
          logger.debug(`[TicketStore] Redis setex warning: ${err.message}`);
        });
      } catch (err) {
        // Fallback remains safely in memory
      }
    }

    return ticketId;
  }

  /**
   * Consume a single-use ticket asynchronously with guaranteed atomicity across distributed instances.
   * Uses Redis GETDEL (or atomic Lua get-and-delete) so only one concurrent request can ever redeem the ticket.
   * If Redis is not connected, safely falls back to atomic local Map deletion.
   * @param {string} ticketId
   * @returns {Promise<Object|null>}
   */
  async consumeTicketAsync(ticketId) {
    if (!ticketId || typeof ticketId !== "string") {
      return null;
    }

    if (isRedisAvailable()) {
      try {
        const client = getRedisClient();
        const key = `devra:ticket:${ticketId}`;
        let raw = null;

        // Redis 6.2+ supports GETDEL directly; fallback to Lua script for earlier versions
        if (typeof client.getdel === "function") {
          raw = await client.getdel(key);
        } else {
          const luaGetDel = `
            local val = redis.call('GET', KEYS[1])
            if val then
              redis.call('DEL', KEYS[1])
            end
            return val
          `;
          raw = await client.eval(luaGetDel, 1, key);
        }

        // Also clean up local in-memory mirror if present
        this.tickets.delete(ticketId);

        if (!raw) {
          return null;
        }

        const entry = JSON.parse(raw);
        if (!entry || entry.used || (entry.expiresAt && Date.now() > entry.expiresAt)) {
          return null;
        }

        return entry.payload;
      } catch (err) {
        logger.warn(`[TicketStore] Redis atomic consume error, falling back to local memory: ${err.message}`);
      }
    }

    // In-memory atomic consumption (single process / dev fallback)
    return this.consumeTicket(ticketId);
  }

  /**
   * Consume a single-use ticket synchronously.
   * Immediately burns the ticket (single-use replay resistance).
   * Works with in-memory map and triggers atomic Redis deletion.
   * @param {string} ticketId 
   * @returns {Object|null}
   */
  consumeTicket(ticketId) {
    if (!ticketId || typeof ticketId !== "string") {
      return null;
    }

    const entry = this.tickets.get(ticketId);

    // If available in Redis, clean it up atomically to prevent cross-replica replay
    if (isRedisAvailable()) {
      try {
        const client = getRedisClient();
        client.del(`devra:ticket:${ticketId}`).catch(() => {});
      } catch {
        // Non-blocking cleanup
      }
    }

    if (!entry) {
      return null;
    }

    // Immediately remove from in-memory store to prevent replay
    this.tickets.delete(ticketId);

    if (entry.used || Date.now() > entry.expiresAt) {
      return null;
    }

    entry.used = true;
    return entry.payload;
  }

  /**
   * Validate a ticket without consuming it (only if explicitly required) or verify active state
   */
  peekTicket(ticketId) {
    if (!ticketId || typeof ticketId !== "string") return null;
    const entry = this.tickets.get(ticketId);
    if (!entry || entry.used || Date.now() > entry.expiresAt) {
      return null;
    }
    return entry.payload;
  }

  cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.tickets.entries()) {
      if (entry.used || now > entry.expiresAt) {
        this.tickets.delete(id);
      }
    }
  }

  clearAll() {
    this.tickets.clear();
  }
}

export const ticketStore = new TicketStore();
export default ticketStore;
