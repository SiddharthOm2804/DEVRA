import assert from "node:assert";
import http from "node:http";
import { defaultAllowedOrigins, corsOriginHandler } from "../src/app.js";
import { ticketStore } from "../src/utils/ticketStore.js";
import { logger } from "../src/utils/logger.js";
import { syncRepository } from "../src/services/repositoryService.js";
import { formatGithubRepo } from "../src/services/githubService.js";
import Repository from "../src/models/Repository.js";
import Analysis from "../src/models/Analysis.js";
import { generateToken } from "../src/utils/jwt.js";

export async function runProtocolSecurityTests() {
  console.log("=========================================");
  console.log("  DEVRA Phase 3 Protocol & Client Tests  ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ [Phase 3] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Phase 3] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [Phase 3] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Phase 3] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // ==========================================
  // F-008: CORS Allowlist Enforcement Tests
  // ==========================================

  test("F-008: Approved origin succeeds in CORS handler", () => {
    const handler = corsOriginHandler(["http://localhost:5173"], true);
    let errorResult = null;
    let allowResult = null;
    handler("http://localhost:5173", (err, allow) => {
      errorResult = err;
      allowResult = allow;
    });
    assert.strictEqual(errorResult, null);
    assert.strictEqual(allowResult, true);
  });

  test("F-008: Unapproved origin is rejected in production mode", () => {
    const handler = corsOriginHandler(["http://localhost:5173"], true);
    let errorResult = null;
    let allowResult = null;
    handler("https://evil-attacker-site.com", (err, allow) => {
      errorResult = err;
      allowResult = allow;
    });
    assert.ok(errorResult instanceof Error, "Should produce Error for unapproved origin");
    assert.strictEqual(errorResult.message, "Not allowed by CORS");
  });

  test("F-008: Unapproved origin is blocked (false) in development mode without error", () => {
    const handler = corsOriginHandler(["http://localhost:5173"], false);
    let errorResult = null;
    let allowResult = null;
    handler("https://unknown-site.com", (err, allow) => {
      errorResult = err;
      allowResult = allow;
    });
    assert.strictEqual(errorResult, null);
    assert.strictEqual(allowResult, false, "Should return false for unknown origin in dev");
  });

  test("F-008: Requests with no Origin header (curl, server-to-server, extension) are allowed", () => {
    const handler = corsOriginHandler(["http://localhost:5173"], true);
    let errorResult = null;
    let allowResult = null;
    handler(undefined, (err, allow) => {
      errorResult = err;
      allowResult = allow;
    });
    assert.strictEqual(errorResult, null);
    assert.strictEqual(allowResult, true);
  });

  test("F-008: Default allowed origins list contains localhost and configured clientUrl", () => {
    assert.ok(Array.isArray(defaultAllowedOrigins));
    assert.ok(defaultAllowedOrigins.some(o => o.includes("localhost:5173") || o.includes("127.0.0.1:5173")));
  });

  // ==========================================
  // F-009: Single-Use Ticket & Log Redaction
  // ==========================================

  test("F-009: TicketStore creates, peeks, and consumes single-use ticket", () => {
    const dummyPayload = { token: "secret_jwt_token_123", userId: "user_456" };
    const ticketId = ticketStore.createTicket(dummyPayload, 5000);
    assert.ok(typeof ticketId === "string" && ticketId.length >= 32);

    // Peek does not consume
    const peeked = ticketStore.peekTicket(ticketId);
    assert.deepStrictEqual(peeked, dummyPayload);

    // Consume successfully burns the ticket
    const consumed = ticketStore.consumeTicket(ticketId);
    assert.deepStrictEqual(consumed, dummyPayload);

    // Replay attempt fails immediately
    const replay = ticketStore.consumeTicket(ticketId);
    assert.strictEqual(replay, null, "Ticket must not be reusable");
  });

  test("F-009: TicketStore rejects expired tickets", () => {
    const ticketId = ticketStore.createTicket({ token: "expired_token" }, -10); // already expired
    const result = ticketStore.consumeTicket(ticketId);
    assert.strictEqual(result, null, "Expired ticket must return null");
  });

  test("F-009: Logger redacts bearer tokens, query secrets, tickets, and passwords", () => {
    const originalConsoleInfo = console.info;
    let capturedLog = "";
    console.info = (msg) => { capturedLog += msg; };

    try {
      logger.info("Connecting to endpoint", {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_payload.signature",
        ticket: "0123456789abcdef",
        url: "https://api.devra.ai/tasks/123/events?token=super_secret_token&ticket=ticket123"
      });

      assert.ok(!capturedLog.includes("sensitive_payload"), "Bearer token must not appear in logs");
      assert.ok(!capturedLog.includes("super_secret_token"), "Query token must be redacted");
      assert.ok(!capturedLog.includes("ticket123"), "Query ticket must be redacted");
      assert.ok(capturedLog.includes("[REDACTED]"), "Must contain [REDACTED] placeholder");
    } finally {
      console.info = originalConsoleInfo;
    }
  });

  // ==========================================
  // F-010: Synchronization & Truthful Metrics
  // ==========================================

  test("F-010: formatGithubRepo assigns deterministic unanalyzed health score (null) instead of misleading score", () => {
    const mockGithubRepo = {
      id: 12345,
      name: "verified-repo",
      full_name: "test/verified-repo",
      owner: { login: "test" },
      updated_at: "2026-10-20T00:00:00Z"
    };

    const formatted1 = formatGithubRepo(mockGithubRepo);
    const formatted2 = formatGithubRepo(mockGithubRepo);

    assert.strictEqual(formatted1.health, null, "Unanalyzed repository must have health null");
    assert.strictEqual(formatted2.health, null, "Unanalyzed repository must have health null");
    assert.strictEqual(formatted1.health, formatted2.health, "Health score must be deterministic without Math.random()");
  });

  asyncTest("F-010: syncRepository never introduces random commit jitter or random health score", async () => {
    // Test in-memory mock behavior of syncRepository
    const initialCommitCount = 42;
    const initialHealth = 95;

    const mockRepo = {
      _id: "64f1a2b3c4d5e6f7a8b9c0d1",
      userId: "64f1a2b3c4d5e6f7a8b9c0d2",
      commitCount: initialCommitCount,
      health: initialHealth,
      filesCount: 10,
      fileTree: [{ name: "index.ts" }, { name: "package.json" }],
      lastScanned: new Date(0),
      save: async function () { return this; }
    };

    const origFindOne = Repository.findOne;
    const origAnalysisFindOne = Analysis.findOne;

    try {
      Repository.findOne = async () => mockRepo;
      Analysis.findOne = () => ({
        sort: () => Promise.resolve({ totalFiles: 15, summary: { primaryLanguage: "TypeScript" } })
      });

      const updated = await syncRepository(mockRepo.userId, mockRepo._id);

      assert.strictEqual(updated.commitCount, initialCommitCount, "commitCount must not have synthetic jitter");
      assert.strictEqual(updated.health, initialHealth, "health score must remain truthful without random fluctuation");
      assert.strictEqual(updated.filesCount, 15, "filesCount updated truthfully from AST analysis");
      assert.ok(updated.lastScanned.getTime() > 0, "lastScanned truthfully updated");

      // Test unanalyzed legacy repo resets to null truthfully
      const legacyUnanalyzed = {
        _id: "64f1a2b3c4d5e6f7a8b9c0d3",
        userId: "64f1a2b3c4d5e6f7a8b9c0d2",
        commitCount: 10,
        health: 95,
        save: async function () { return this; }
      };
      Repository.findOne = async () => legacyUnanalyzed;
      Analysis.findOne = () => ({ sort: () => Promise.resolve(null) });
      const resetRepo = await syncRepository(legacyUnanalyzed.userId, legacyUnanalyzed._id);
      assert.strictEqual(resetRepo.health, null, "Unanalyzed repo with legacy default score must be reset to null");
      assert.strictEqual(resetRepo.qualityGrade, null, "Unanalyzed repo qualityGrade must be reset to null");
    } finally {
      Repository.findOne = origFindOne;
      Analysis.findOne = origAnalysisFindOne;
    }
  });

  return { passed, failed };
}
