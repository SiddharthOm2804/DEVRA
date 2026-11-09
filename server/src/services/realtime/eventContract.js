import crypto from "crypto";

/**
 * Standard DEVRA Realtime Event Types
 */
export const EVENT_TYPES = {
  TASK_STARTED: "task.started",
  TASK_PROGRESS: "task.progress",
  TASK_STEP: "task.step",
  REVIEW_STARTED: "review.started",
  REVIEW_FINDING: "review.finding",
  REVIEW_COMPLETED: "review.completed",
  TASK_COMPLETED: "task.completed",
  TASK_FAILED: "task.failed",
  TASK_CANCELLED: "task.cancelled",
  HEARTBEAT: "heartbeat"
};

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passphrase/i,
  /token/i,
  /secret/i,
  /api[-_]?key/i,
  /auth(?:orization)?/i,
  /credential/i,
  /private[-_]?key/i,
  /cookie/i,
  /session/i
];

function isSensitiveKey(key) {
  if (typeof key !== "string") return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Sanitizes event payloads to ensure no secrets, auth tokens, passwords, or credentials leak.
 * Uses a recursion activeStack (Set) to detect actual circular reference cycles while safely
 * permitting repeated/shared non-circular object references.
 */
export function sanitizePayload(payload = {}, activeStack = new Set()) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  // Handle Date objects preserving instanceof Date
  if (payload instanceof Date) {
    return new Date(payload.getTime());
  }

  // Convert Mongoose documents or objects with toObject/toJSON to plain objects
  let target = payload;
  if (typeof target.toObject === "function") {
    try {
      target = target.toObject();
    } catch {
      // Fallback to target if toObject fails
    }
  } else if (typeof target.toJSON === "function") {
    try {
      target = target.toJSON();
    } catch {
      // Fallback to target if toJSON fails
    }
  }

  if (!target || typeof target !== "object") {
    return target;
  }

  if (target instanceof Date) {
    return new Date(target.getTime());
  }

  // Handle circular reference cycles on active recursion path
  if (activeStack.has(target)) {
    return "[Circular]";
  }

  activeStack.add(target);

  try {
    if (Array.isArray(target)) {
      return target.map((item) => sanitizePayload(item, activeStack));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(target)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = "[REDACTED]";
      } else if (value && typeof value === "object") {
        sanitized[key] = sanitizePayload(value, activeStack);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  } finally {
    // Unwind recursion stack so sibling/shared references are preserved
    activeStack.delete(target);
  }
}

/**
 * Factory function creating a typed, validated event object
 */
export function createEvent({
  type = EVENT_TYPES.TASK_PROGRESS,
  taskId,
  progress = null,
  payload = null,
  eventId = null
}) {
  const id = eventId || `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const timestamp = new Date().toISOString();

  let formattedProgress = null;
  if (progress) {
    formattedProgress = {
      step: progress.step !== undefined ? Number(progress.step) : undefined,
      totalSteps: progress.totalSteps !== undefined ? Number(progress.totalSteps) : undefined,
      percent: progress.percent !== undefined ? Math.min(100, Math.max(0, Number(progress.percent))) : undefined,
      message: progress.message ? String(progress.message) : "",
      phase: progress.phase || undefined
    };
  }

  return {
    id,
    type,
    taskId: taskId ? String(taskId) : null,
    timestamp,
    progress: formattedProgress,
    payload: payload ? sanitizePayload(payload) : null
  };
}

/**
 * Serializes an event into Server-Sent Events (SSE) standard line format
 */
export function formatSSEMessage(event) {
  const eventObj = typeof event === "string" ? JSON.parse(event) : event;
  const idStr = eventObj.id ? `id: ${eventObj.id}\n` : "";
  const eventTypeStr = eventObj.type ? `event: ${eventObj.type}\n` : "";
  const dataStr = `data: ${JSON.stringify(eventObj)}\n\n`;
  return `${idStr}${eventTypeStr}${dataStr}`;
}

export default {
  EVENT_TYPES,
  sanitizePayload,
  createEvent,
  formatSSEMessage
};
