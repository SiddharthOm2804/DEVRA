/**
 * DEVRA Prometheus Metrics Registry & Instrumentations
 * Zero high-cardinality labels, safe fallback error guards, bounded buckets.
 */

import client from "prom-client";

// Global custom registry to avoid collision with default collectors if isolated
export const register = new client.Registry();

// Enable standard Node.js runtime metrics (CPU, Memory, Event Loop, GC)
client.collectDefaultMetrics({
  register,
  prefix: "devra_",
  labels: { app: "devra-server" }
});

// ==========================================
// 1. HTTP Server Metrics
// ==========================================

export const httpRequestTotal = new client.Counter({
  name: "devra_http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "status_code", "status_class"],
  registers: [register]
});
export const httpRequestsTotal = httpRequestTotal;

export const httpRequestDurationSeconds = new client.Histogram({
  name: "devra_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_class"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

export const httpInFlightRequests = new client.Gauge({
  name: "devra_http_in_flight_requests",
  help: "Current number of in-flight HTTP requests",
  labelNames: ["method"],
  registers: [register]
});
export const httpInFlightRequestsGauge = httpInFlightRequests;

// ==========================================
// 2. AI Agent Mode Metrics
// ==========================================

export const agentTasksTotal = new client.Counter({
  name: "devra_agent_tasks_total",
  help: "Total number of autonomous agent tasks executed",
  labelNames: ["task_type", "status"], // task_type: plan|patch|apply; status: success|error|cancelled
  registers: [register]
});

export const agentTaskDurationSeconds = new client.Histogram({
  name: "devra_agent_task_duration_seconds",
  help: "Execution duration for agent planning and patch generation",
  labelNames: ["task_type"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register]
});

export const agentActiveTasksGauge = new client.Gauge({
  name: "devra_agent_active_tasks",
  help: "Current number of actively running autonomous agent tasks",
  registers: [register]
});

// ==========================================
// 3. RAG Retrieval & Vector Store Metrics
// ==========================================

export const ragRetrievalTotal = new client.Counter({
  name: "devra_rag_retrieval_total",
  help: "Total RAG semantic retrieval requests performed",
  labelNames: ["backend", "status"], // success | failure
  registers: [register]
});

export const ragRetrievalDurationSeconds = new client.Histogram({
  name: "devra_rag_retrieval_duration_seconds",
  help: "Duration of RAG context retrieval in seconds",
  labelNames: ["backend"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register]
});

export const vectorStoreOperationsTotal = new client.Counter({
  name: "devra_vector_store_operations_total",
  help: "Vector store operations count",
  labelNames: ["backend", "operation", "status"], // backend: redis|memory; operation: search|upsert|delete
  registers: [register]
});

export const vectorStoreOperationDurationSeconds = new client.Histogram({
  name: "devra_vector_store_operation_duration_seconds",
  help: "Duration of vector store operations in seconds",
  labelNames: ["backend", "operation"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1, 2],
  registers: [register]
});

export const treeSitterParseOperationsTotal = new client.Counter({
  name: "devra_treesitter_parse_operations_total",
  help: "Tree-sitter WASM parsing operations count",
  labelNames: ["language", "status"], // status: success|fallback|error
  registers: [register]
});

export const treeSitterParseDurationSeconds = new client.Histogram({
  name: "devra_treesitter_parse_duration_seconds",
  help: "Tree-sitter WASM code parsing duration in seconds",
  labelNames: ["language"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register]
});

// ==========================================
// 4. Server-Sent Events (SSE) Metrics
// ==========================================

export const sseActiveConnectionsGauge = new client.Gauge({
  name: "devra_sse_active_connections",
  help: "Current number of active Server-Sent Events client streams",
  registers: [register]
});

export const sseEventsEmittedTotal = new client.Counter({
  name: "devra_sse_events_emitted_total",
  help: "Total SSE events streamed to clients",
  labelNames: ["event_type"], // TASK_PROGRESS, TASK_COMPLETED, etc.
  registers: [register]
});

export const sseConnectionDurationSeconds = new client.Histogram({
  name: "devra_sse_connection_duration_seconds",
  help: "Duration of SSE client stream sessions",
  buckets: [1, 5, 15, 30, 60, 120, 300, 600],
  registers: [register]
});

// ==========================================
// 5. Dependency Health Metrics
// ==========================================

export const dependencyHealthStatus = new client.Gauge({
  name: "devra_dependency_health_status",
  help: "Health status of backing infrastructure dependencies (1 = healthy, 0 = unhealthy)",
  labelNames: ["dependency"], // redis | mongodb
  registers: [register]
});

export const dependencyHealthCheckDurationSeconds = new client.Histogram({
  name: "devra_dependency_health_check_duration_seconds",
  help: "Duration of dependency ping/health verification in seconds",
  labelNames: ["dependency"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

/**
 * Normalizes HTTP route path to prevent high-cardinality metric explosion.
 * Replaces ObjectIds, UUIDs, and dynamic hashes with parameterized tokens.
 */
export function normalizeRoute(path) {
  if (!path) return "unknown";
  return path
    .split("?")[0]
    .replace(/[0-9a-fA-F]{24}/g, ":id")
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ":uuid")
    .replace(/\/(repo|session|user|rev)-[a-zA-Z0-9_-]+/g, "/:id");
}
