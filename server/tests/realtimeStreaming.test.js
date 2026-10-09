import assert from "node:assert";
import { EVENT_TYPES, createEvent, sanitizePayload, formatSSEMessage } from "../src/services/realtime/eventContract.js";
import { RealtimeEventBus, eventBus } from "../src/services/realtime/eventBus.js";
import { getVectorStore } from "../src/services/vectorStore/index.js";

export async function runRealtimeStreamingTests() {
  console.log("\n=========================================");
  console.log("  DEVRA Realtime Streaming (SSE) Tests   ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [Streaming] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Streaming] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Event Serialization Format
  test("formatSSEMessage serializes standard SSE id, event, and data lines", () => {
    const event = createEvent({
      type: EVENT_TYPES.TASK_PROGRESS,
      taskId: "task-12345",
      progress: { step: 2, totalSteps: 4, percent: 50, message: "Synthesizing AST plan..." },
      payload: { status: "planning" }
    });

    const sseText = formatSSEMessage(event);
    assert.ok(sseText.startsWith(`id: ${event.id}\n`));
    assert.ok(sseText.includes("event: task.progress\n"));
    assert.ok(sseText.includes('data: {"id":'));
    assert.ok(sseText.endsWith("\n\n"));

    const parsedData = JSON.parse(sseText.split("data: ")[1].trim());
    assert.strictEqual(parsedData.taskId, "task-12345");
    assert.strictEqual(parsedData.progress.percent, 50);
  });

  // 2. Event Payload Sanitization
  test("sanitizePayload redacts sensitive passwords, secrets, and auth tokens", () => {
    const rawPayload = {
      user: "developer@devpilot.ai",
      password: "SuperSecretPassword123!",
      authToken: "bearer_xyz_jwt_token_12345",
      apiKey: "sk-live-secret-key-abcdef",
      nested: {
        jwt_secret: "hidden_secret_value",
        publicData: "visible"
      }
    };

    const sanitized = sanitizePayload(rawPayload);
    assert.strictEqual(sanitized.user, "developer@devpilot.ai");
    assert.strictEqual(sanitized.password, "[REDACTED]");
    assert.strictEqual(sanitized.authToken, "[REDACTED]");
    assert.strictEqual(sanitized.apiKey, "[REDACTED]");
    assert.strictEqual(sanitized.nested.jwt_secret, "[REDACTED]");
    assert.strictEqual(sanitized.nested.publicData, "visible");
  });

  // 3. EventBus Publishing & Subscription
  await test("EventBus publishes and delivers task events to registered subscribers", async () => {
    const bus = eventBus;
    const receivedEvents = [];

    const unsubscribe = bus.subscribeTask("task-test-01", (event) => {
      receivedEvents.push(event);
    });

    await bus.publishTaskEvent("task-test-01", {
      type: EVENT_TYPES.TASK_STARTED,
      progress: { phase: "planning", message: "Task initialized" }
    });

    await bus.publishTaskEvent("task-test-01", {
      type: EVENT_TYPES.TASK_PROGRESS,
      progress: { step: 1, totalSteps: 2, percent: 50, message: "In progress" }
    });

    assert.strictEqual(receivedEvents.length, 2);
    assert.strictEqual(receivedEvents[0].type, EVENT_TYPES.TASK_STARTED);
    assert.strictEqual(receivedEvents[1].progress.percent, 50);

    unsubscribe();
  });

  // 4. Subscription Teardown & Leak Prevention
  await test("Unsubscribe cleanly detaches listener and prevents duplicate event delivery", async () => {
    const bus = eventBus;
    let callCount = 0;

    const unsubscribe = bus.subscribeTask("task-leak-test", () => {
      callCount++;
    });

    await bus.publishTaskEvent("task-leak-test", { type: EVENT_TYPES.HEARTBEAT });
    assert.strictEqual(callCount, 1);

    // Unsubscribe and publish again
    unsubscribe();
    await bus.publishTaskEvent("task-leak-test", { type: EVENT_TYPES.HEARTBEAT });
    assert.strictEqual(callCount, 1); // Count remains 1, no duplicate leaks
  });

  // 5. Cross-Task Event Scoping
  await test("Subscribers only receive events matching their target taskId", async () => {
    const bus = eventBus;
    const eventsA = [];
    const eventsB = [];

    const unsubA = bus.subscribeTask("task-A", (evt) => eventsA.push(evt));
    const unsubB = bus.subscribeTask("task-B", (evt) => eventsB.push(evt));

    await bus.publishTaskEvent("task-A", { type: EVENT_TYPES.TASK_PROGRESS, progress: { message: "Msg for A" } });
    await bus.publishTaskEvent("task-B", { type: EVENT_TYPES.TASK_PROGRESS, progress: { message: "Msg for B" } });

    assert.strictEqual(eventsA.length, 1);
    assert.strictEqual(eventsA[0].progress.message, "Msg for A");
    assert.strictEqual(eventsB.length, 1);
    assert.strictEqual(eventsB[0].progress.message, "Msg for B");

    unsubA();
    unsubB();
  });

  // 6. Progress and Step Progression
  await test("Task progress percentage clamps between 0 and 100", () => {
    const underEvent = createEvent({ taskId: "t1", progress: { percent: -15 } });
    assert.strictEqual(underEvent.progress.percent, 0);

    const overEvent = createEvent({ taskId: "t1", progress: { percent: 150 } });
    assert.strictEqual(overEvent.progress.percent, 100);

    const normalEvent = createEvent({ taskId: "t1", progress: { percent: 75.5 } });
    assert.strictEqual(normalEvent.progress.percent, 75.5);
  });

  // 7. Terminal Completion Event
  await test("Task completed event contains sanitized payload and 100% progress", async () => {
    let captured = null;
    const unsub = eventBus.subscribeTask("task-done-01", (evt) => {
      captured = evt;
    });

    await eventBus.publishTaskEvent("task-done-01", {
      type: EVENT_TYPES.TASK_COMPLETED,
      progress: { phase: "applied", step: 3, totalSteps: 3, percent: 100, message: "All diffs applied" },
      payload: { changedFiles: 3 }
    });

    assert.ok(captured);
    assert.strictEqual(captured.type, EVENT_TYPES.TASK_COMPLETED);
    assert.strictEqual(captured.progress.percent, 100);
    assert.strictEqual(captured.payload.changedFiles, 3);

    unsub();
  });

  // 8. Task Cancellation Event
  await test("Task cancellation emits TASK_CANCELLED with rejection rationale", async () => {
    let cancelledEvt = null;
    const unsub = eventBus.subscribeTask("task-cancel-01", (evt) => {
      cancelledEvt = evt;
    });

    await eventBus.publishTaskEvent("task-cancel-01", {
      type: EVENT_TYPES.TASK_CANCELLED,
      progress: { phase: "rejected", message: "User rejected diff" },
      payload: { reason: "Code format not matching style guide" }
    });

    assert.ok(cancelledEvt);
    assert.strictEqual(cancelledEvt.type, EVENT_TYPES.TASK_CANCELLED);
    assert.strictEqual(cancelledEvt.payload.reason, "Code format not matching style guide");

    unsub();
  });

  // 9. Heartbeat Keep-Alive Event
  test("Heartbeat events produce valid SSE keep-alives without payload bloat", () => {
    const hb = createEvent({ type: EVENT_TYPES.HEARTBEAT, taskId: "task-hb" });
    assert.strictEqual(hb.type, EVENT_TYPES.HEARTBEAT);
    assert.strictEqual(hb.payload, null);

    const formatted = formatSSEMessage(hb);
    assert.ok(formatted.includes("event: heartbeat\n"));
  });

  // 10. EventBus Health Telemetry
  test("EventBus healthCheck accurately reports mode and listener telemetry", () => {
    const health = eventBus.healthCheck();
    assert.strictEqual(health.type, "realtime-eventbus");
    assert.ok(["in-memory", "redis-pubsub"].includes(health.mode));
    assert.ok(typeof health.activeTaskSubscriptions === "number");
  });

  // 11. Vector Store Integration & Non-Regression
  await test("Persistent Redis / Memory Vector Store remains functional alongside EventBus", async () => {
    const vectorStore = await getVectorStore();
    const health = await vectorStore.healthCheck();
    assert.strictEqual(health.healthy, true);
    assert.ok(["redis", "memory"].includes(health.type));
  });

  return { passed, failed };
}

export default runRealtimeStreamingTests;
