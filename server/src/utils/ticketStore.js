import crypto from "crypto";
import logger from "./logger.js";

/**
 * Short-lived single-use ticket store for sensitive token exchange (OAuth callbacks & SSE stream tickets)
 * Prevents bearer JWT leakage in browser URLs, logs, and browser history.
 */
class TicketStore {
  constructor(defaultTtlMs = 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
    this.tickets = new Map();

    // Periodic sweep for expired tickets (runs every minute)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Create a single-use ticket for arbitrary payload data (e.g. JWT token or user/session binding)
   * @param {Object} payload 
   * @param {number} [ttlMs] 
   * @returns {string} ticket id
   */
  createTicket(payload, ttlMs = this.defaultTtlMs) {
    const ticketId = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    this.tickets.set(ticketId, {
      payload,
      expiresAt: now + ttlMs,
      used: false
    });
    return ticketId;
  }

  /**
   * Consume a single-use ticket. Returns payload if valid, not expired, and unused.
   * Immediately burns the ticket (single-use replay resistance).
   * @param {string} ticketId 
   * @returns {Object|null}
   */
  consumeTicket(ticketId) {
    if (!ticketId || typeof ticketId !== "string") {
      return null;
    }

    const entry = this.tickets.get(ticketId);
    if (!entry) {
      return null;
    }

    // Immediately remove from store to prevent replay
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
