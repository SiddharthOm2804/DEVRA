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

/**
 * Sanitizes event payloads to ensure no secrets, auth tokens, passwords, or dangerous scripts leak
 */
export function sanitizePayload(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const sanitized = Array.isArray(payload) ? [] : {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();

    // Redact sensitive credentials and keys
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("token") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("apikey") ||
      lowerKey.includes("authorization")
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !(value instanceof Date)) {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
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
