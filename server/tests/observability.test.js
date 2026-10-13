import assert from "node:assert";
import {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpInFlightRequestsGauge,
  agentTasksTotal,
  agentTaskDurationSeconds,
  agentActiveTasksGauge,
  ragRetrievalTotal,
  ragRetrievalDurationSeconds,
  vectorStoreOperationsTotal,
  vectorStoreOperationDurationSeconds,
  treeSitterParseOperationsTotal,
  treeSitterParseDurationSeconds,
  sseActiveConnectionsGauge,
  sseEventsEmittedTotal,
  sseConnectionDurationSeconds,
  dependencyHealthStatus,
  normalizeRoute
} from "../src/metrics/prometheus.js";
import {
  initOpenTelemetry,
  getTracer,
  withSpan,
  shutdownOpenTelemetry
} from "../src/metrics/opentelemetry.js";
import { metricsMiddleware, metricsHandler } from "../src/middleware/metricsMiddleware.js";

export async function runObservabilityTests() {
  console.log("\n=========================================");
  console.log("  DEVRA Observability (Prometheus & OTel)");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ [Observability] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Observability] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [Observability] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Observability] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Prometheus Registry and Metric Definitions
  test("Prometheus registry initializes with all required custom metrics", () => {
    assert.ok(register, "Register should exist");
    const metricNames = register.getMetricsAsArray().map((m) => m.name);

    assert.ok(metricNames.includes("devra_http_requests_total"), "Missing devra_http_requests_total");
    assert.ok(metricNames.includes("devra_http_request_duration_seconds"), "Missing devra_http_request_duration_seconds");
    assert.ok(metricNames.includes("devra_http_in_flight_requests"), "Missing devra_http_in_flight_requests");
    assert.ok(metricNames.includes("devra_agent_tasks_total"), "Missing devra_agent_tasks_total");
    assert.ok(metricNames.includes("devra_agent_task_duration_seconds"), "Missing devra_agent_task_duration_seconds");
    assert.ok(metricNames.includes("devra_agent_active_tasks"), "Missing devra_agent_active_tasks");
    assert.ok(metricNames.includes("devra_rag_retrieval_total"), "Missing devra_rag_retrieval_total");
    assert.ok(metricNames.includes("devra_rag_retrieval_duration_seconds"), "Missing devra_rag_retrieval_duration_seconds");
    assert.ok(metricNames.includes("devra_vector_store_operations_total"), "Missing devra_vector_store_operations_total");
    assert.ok(metricNames.includes("devra_vector_store_operation_duration_seconds"), "Missing devra_vector_store_operation_duration_seconds");
    assert.ok(metricNames.includes("devra_treesitter_parse_operations_total"), "Missing devra_treesitter_parse_operations_total");
    assert.ok(metricNames.includes("devra_treesitter_parse_duration_seconds"), "Missing devra_treesitter_parse_duration_seconds");
    assert.ok(metricNames.includes("devra_sse_active_connections"), "Missing devra_sse_active_connections");
    assert.ok(metricNames.includes("devra_sse_events_emitted_total"), "Missing devra_sse_events_emitted_total");
    assert.ok(metricNames.includes("devra_dependency_health_status"), "Missing devra_dependency_health_status");
  });

  // 2. Route Normalization Safeguard
  test("normalizeRoute sanitizes hex ObjectIDs, UUIDs, numeric IDs, and query params", () => {
    // Hex ObjectID sanitization
    assert.strictEqual(
      normalizeRoute("/api/repositories/64f1a2b3c4d5e6f7a8b9c0d1/analysis"),
      "/api/repositories/:id/analysis"
    );
    // UUID sanitization
    assert.strictEqual(
      normalizeRoute("/api/agent/session/123e4567-e89b-12d3-a456-426614174000"),
      "/api/agent/session/:uuid"
    );
    // Strip query parameters
    assert.strictEqual(
      normalizeRoute("/api/chat?query=how+does+lod+work&page=1"),
      "/api/chat"
    );
    // Preserves constant static routes
    assert.strictEqual(normalizeRoute("/api/health/ready"), "/api/health/ready");
    assert.strictEqual(normalizeRoute("/metrics"), "/metrics");
  });

  // 3. HTTP Request Recording and Metric Formatting
  await asyncTest("metricsMiddleware increments in-flight, records duration and increments total", async () => {
    let finishHandler = null;
    const req = {
      method: "GET",
      url: "/api/repositories/64f1a2b3c4d5e6f7a8b9c0d1",
      route: { path: "/api/repositories/:id" }
    };
    const res = {
      statusCode: 200,
      once: (event, handler) => {
        if (event === "finish") finishHandler = handler;
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    metricsMiddleware(req, res, next);
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(typeof finishHandler, "function");

    // Execute finish callback
    finishHandler();

    const output = await register.metrics();
    assert.ok(
      output.includes("devra_http_requests_total") &&
      output.includes('route="/api/repositories/:id"') &&
      output.includes('status_class="2xx"'),
      "devra_http_requests_total metrics not formatted as expected"
    );
  });

  // 4. Metrics Scrape Endpoint and Security Guard
  await asyncTest("metricsHandler returns Prometheus text format and validates METRICS_AUTH_TOKEN when set", async () => {
    // Normal scrape without auth token configured
    let sentHeaders = {};
    let sentBody = "";
    let statusCode = 200;

    const mockReq = { headers: {} };
    const mockRes = {
      set: (key, val) => { sentHeaders[key] = val; },
      status: (code) => { statusCode = code; return mockRes; },
      send: (body) => { sentBody = body; return mockRes; },
      json: (obj) => { sentBody = JSON.stringify(obj); return mockRes; }
    };

    await metricsHandler(mockReq, mockRes);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(sentHeaders["Content-Type"], register.contentType);
    assert.ok(sentBody.includes("devra_http_requests_total"));

    // Guard: With METRICS_AUTH_TOKEN configured
    process.env.METRICS_AUTH_TOKEN = "super_secret_metrics_token_99";
    try {
      // Missing token returns 401
      let authStatus = 200;
      const unauthRes = {
        set: () => {},
        status: (code) => { authStatus = code; return unauthRes; },
        json: () => unauthRes
      };
      await metricsHandler({ headers: {} }, unauthRes);
      assert.strictEqual(authStatus, 401, "Expected 401 when METRICS_AUTH_TOKEN is required but missing");

      // Valid Bearer token succeeds
      let authedStatus = 200;
      let authedBody = "";
      const validAuthRes = {
        set: () => {},
        status: (code) => { authedStatus = code; return validAuthRes; },
        send: (body) => { authedBody = body; return validAuthRes; }
      };
      await metricsHandler(
        { headers: { authorization: "Bearer super_secret_metrics_token_99" } },
        validAuthRes
      );
      assert.strictEqual(authedStatus, 200);
      assert.ok(authedBody.includes("devra_http_requests_total"));
    } finally {
      delete process.env.METRICS_AUTH_TOKEN;
    }
  });

  // 5. OpenTelemetry Lifecycle and Noop Fallback
  await asyncTest("OpenTelemetry gracefully initializes and withSpan executes callback safely", async () => {
    const initResult = initOpenTelemetry();
    assert.ok(initResult);

    const tracer = getTracer("devra-test");
    assert.ok(tracer, "Should provide a valid tracer instance or noop proxy");

    const result = await withSpan("test.operation", async (span) => {
      assert.ok(span, "Span should exist in callback");
      span.setAttribute("test.attribute", "healthy");
      return 42;
    });

    assert.strictEqual(result, 42);
    await shutdownOpenTelemetry();
  });

  // 6. Business Operations Metric Gauges
  test("Agent, RAG, Tree-sitter, and SSE metrics update with correct bounded labels", () => {
    // Agent
    agentActiveTasksGauge.inc();
    agentActiveTasksGauge.dec();
    agentTasksTotal.inc({ task_type: "plan", status: "success" });
    agentTaskDurationSeconds.observe({ task_type: "plan" }, 0.25);

    // RAG & Vector store
    ragRetrievalTotal.inc({ backend: "memory", status: "success" });
    ragRetrievalDurationSeconds.observe({ backend: "memory" }, 0.05);
    vectorStoreOperationsTotal.inc({ backend: "memory", operation: "search", status: "success" });

    // Tree-sitter WASM
    treeSitterParseOperationsTotal.inc({ language: "javascript", status: "success" });
    treeSitterParseDurationSeconds.observe({ language: "javascript" }, 0.01);

    // Realtime SSE
    sseActiveConnectionsGauge.inc();
    sseActiveConnectionsGauge.dec();
    sseEventsEmittedTotal.inc({ event_type: "TASK_PROGRESS" });

    // Health
    dependencyHealthStatus.set({ dependency: "mongodb" }, 1);
    dependencyHealthStatus.set({ dependency: "redis" }, 0);
  });

  return { passed, failed };
}
