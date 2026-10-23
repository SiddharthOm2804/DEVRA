import assert from "node:assert";
import mongoose from "mongoose";
import { getUserRepositories } from "../src/services/repositoryService.js";
import { getAvailableGithubRepos } from "../src/controllers/repositoryController.js";
import { buildRepositoryKnowledgeChunks } from "../src/services/retriever.js";
import { emailService } from "../src/services/emailService.js";
import Repository from "../src/models/Repository.js";
import User from "../src/models/User.js";

export async function runTruthfulnessTests() {
  console.log("=========================================");
  console.log("  DEVRA Phase 2 Truthfulness & Mock Suite ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ [Truthfulness] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Truthfulness] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [Truthfulness] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Truthfulness] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // ==========================================
  // F-001: Genuine Empty State for User Repositories
  // ==========================================

  await asyncTest("F-001: User with no repositories receives genuine empty array [] without seeding", async () => {
    const syntheticUserId = new mongoose.Types.ObjectId();
    const testDbUri = process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/devra_test_truthfulness";

    let connectedHere = false;
    if (mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(testDbUri, { serverSelectionTimeoutMS: 3000 });
        connectedHere = true;
      } catch (err) {
        // If local MongoDB is not running, test repositoryService query logic using Model mock
        const originalFind = Repository.find;
        Repository.find = (q) => ({
          sort: async () => []
        });
        try {
          const res = await getUserRepositories(syntheticUserId);
          assert.strictEqual(Array.isArray(res), true);
          assert.strictEqual(res.length, 0);
          return;
        } finally {
          Repository.find = originalFind;
        }
      }
    }

    try {
      // Check initial repository count in MongoDB
      const beforeCount = await Repository.countDocuments({ userId: syntheticUserId });
      assert.strictEqual(beforeCount, 0);

      // Call getUserRepositories
      const result = await getUserRepositories(syntheticUserId);
      assert.strictEqual(Array.isArray(result), true);
      assert.strictEqual(result.length, 0);

      // Verify no records were auto-seeded into the database
      const afterCount = await Repository.countDocuments({ userId: syntheticUserId });
      assert.strictEqual(afterCount, 0);
    } finally {
      if (connectedHere) {
        await mongoose.disconnect();
      }
    }
  });


  // ==========================================
  // F-002: Truthful GitHub Error Responses
  // ==========================================

  await asyncTest("F-002: Disconnected GitHub account returns 400 GITHUB_NOT_CONNECTED without simulated repos", async () => {
    const syntheticUser = {
      _id: new mongoose.Types.ObjectId(),
      isGithubConnected: false,
      githubAccessToken: null,
      githubUsername: null
    };

    const mockReq = {
      user: { _id: syntheticUser._id }
    };

    let responseStatus = null;
    let responsePayload = null;

    const mockRes = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(p) {
        responsePayload = p;
        return this;
      }
    };

    // Temporarily mock User.findById
    const originalFindById = User.findById;
    User.findById = () => ({
      select: async () => syntheticUser
    });

    try {
      await getAvailableGithubRepos(mockReq, mockRes, () => {});
      assert.strictEqual(responseStatus, 400);
      assert.strictEqual(responsePayload.success, false);
      assert.strictEqual(responsePayload.code, "GITHUB_NOT_CONNECTED");
      assert.strictEqual(responsePayload.repositories, undefined);
    } finally {
      User.findById = originalFindById;
    }
  });

  // ==========================================
  // F-006: Grounded RAG Chunks (No paymentService.js)
  // ==========================================

  test("F-006: Knowledge chunks do NOT include nonexistent paymentService.js or hardcoded auth chunks", () => {
    const sampleRepo = {
      name: "custom-repo",
      activeBranch: "main",
      fileTree: []
    };

    const emptyChunks = buildRepositoryKnowledgeChunks(sampleRepo, null);
    // When no analysis and empty fileTree, return empty chunks
    assert.strictEqual(emptyChunks.length, 0);

    // Ensure paymentService.js is NEVER fabricated
    const hasPayment = emptyChunks.some((c) => c.filePath?.includes("paymentService"));
    assert.strictEqual(hasPayment, false);

    // When real files are provided in analysis, chunks are strictly derived from them
    const realAnalysis = {
      files: [
        { path: "src/index.js", name: "index.js", lines: 50, language: "JavaScript" },
        { path: "src/utils.js", name: "utils.js", lines: 25, language: "JavaScript" }
      ]
    };

    const realChunks = buildRepositoryKnowledgeChunks(sampleRepo, realAnalysis);
    assert.strictEqual(realChunks.length, 2);
    assert.strictEqual(realChunks[0].filePath, "src/index.js");
    assert.strictEqual(realChunks[1].filePath, "src/utils.js");
    assert.ok(!realChunks.some((c) => c.filePath.includes("paymentService")));
  });

  // ==========================================
  // F-007: Password Reset URL & Token Redaction
  // ==========================================

  await asyncTest("F-007: EmailService logs never output raw reset tokens or full reset URL", async () => {
    const capturedLogs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      capturedLogs.push(args.join(" "));
    };

    const rawToken = "super_secret_raw_reset_token_hex_99999";
    const fullResetUrl = `https://devra.ai/reset-password/${rawToken}`;

    try {
      await emailService.sendPasswordReset({
        to: "developer@example.com",
        resetUrl: fullResetUrl,
        name: "Security Lead"
      });

      const allOutput = capturedLogs.join("\n");
      assert.strictEqual(allOutput.includes(rawToken), false, "Raw reset token must NOT appear in console logs");
      assert.strictEqual(allOutput.includes(fullResetUrl), false, "Full reset URL must NOT appear in console logs");
      assert.ok(allOutput.includes("[REDACTED_SECURITY_TOKEN]"), "Token is explicitly marked as redacted");
    } finally {
      console.log = originalLog;
    }
  });

  return { passed, failed };
}
