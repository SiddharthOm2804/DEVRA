import assert from "node:assert";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { shouldIgnorePath, detectLanguage, detectEntryPoint } from "./src/services/codeAnalysisService.js";
import { generateUnifiedDiff, validateProposedCodeSafeguards } from "./src/services/agentService.js";
import { runVectorStoreTests } from "./tests/vectorStore.test.js";
import { runRealtimeStreamingTests } from "./tests/realtimeStreaming.test.js";
import { runRbacTests } from "./tests/rbac.test.js";
import { eventBus } from "./src/services/realtime/eventBus.js";

async function runTests() {
  console.log("=========================================");
  console.log("  DEVRA / DevPilot Backend Test Suite    ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Password Hashing & Verification
  await asyncTest("Bcrypt hashes and verifies password correctly", async () => {
    const rawPassword = "SuperSecurePassword123!";
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);
    assert.notStrictEqual(hash, rawPassword);
    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isMatch, true);
    const isWrongMatch = await bcrypt.compare("WrongPassword", hash);
    assert.strictEqual(isWrongMatch, false);
  });

  // 2. JWT Token Signing & Verification
  test("JWT signs and verifies payload safely", () => {
    const secret = "test_jwt_secret_key_devra";
    const payload = { id: "user-123", email: "test@devpilot.ai", role: "developer" };
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.id, "user-123");
    assert.strictEqual(decoded.email, "test@devpilot.ai");
  });

  // 3. Code Analysis AST Ignore Filter
  test("AST analyzer correctly ignores binary and vendor directories", () => {
    assert.strictEqual(shouldIgnorePath("node_modules/express/index.js"), true);
    assert.strictEqual(shouldIgnorePath(".git/config"), true);
    assert.strictEqual(shouldIgnorePath("dist/assets/index.js"), true);
    assert.strictEqual(shouldIgnorePath("public/image.png"), true);
    assert.strictEqual(shouldIgnorePath("package-lock.json"), true);
    assert.strictEqual(shouldIgnorePath("src/controllers/authController.js"), false);
    assert.strictEqual(shouldIgnorePath("client/src/App.jsx"), false);
  });

  // 4. Language Detection
  test("Language detector identifies TypeScript, JavaScript, Python, Go, Rust", () => {
    assert.strictEqual(detectLanguage("src/index.ts").name, "TypeScript");
    assert.strictEqual(detectLanguage("src/App.jsx").name, "JavaScript");
    assert.strictEqual(detectLanguage("backend/main.py").name, "Python");
    assert.strictEqual(detectLanguage("cmd/server.go").name, "Go");
    assert.strictEqual(detectLanguage("src/main.rs").name, "Rust");
  });

  // 5. Entry Point Detection
  test("Entry point detector flags main files and app bootstrappers", () => {
    const serverEntry = detectEntryPoint("src/server.js");
    assert.strictEqual(serverEntry.isEntry, true);
    assert.strictEqual(serverEntry.type, "server");

    const mainEntry = detectEntryPoint("src/main.tsx");
    assert.strictEqual(mainEntry.isEntry, true);
    assert.strictEqual(mainEntry.type, "client");

    const helperEntry = detectEntryPoint("src/utils/helpers.js");
    assert.strictEqual(helperEntry.isEntry, false);
  });

  // 6. Diff Generator
  test("Unified diff generator produces clean diffs", () => {
    const original = "const a = 1;\nconst b = 2;";
    const proposed = "const a = 1;\nconst b = 3;";
    const diff = generateUnifiedDiff("src/calc.js", original, proposed);
    assert.ok(diff.includes("--- a/src/calc.js"));
    assert.ok(diff.includes("+++ b/src/calc.js"));
    assert.ok(diff.includes("+ const b = 3;"));
  });

  // 7. Security Safeguards Guard
  test("Agent safeguards prevent hardcoded credentials and dangerous scripts", () => {
    assert.throws(() => {
      validateProposedCodeSafeguards("src/api.js", "const apiKey = 'sk_live_1234567890abcdef';");
    }, /Hardcoded credentials/);

    assert.throws(() => {
      validateProposedCodeSafeguards("src/cmd.js", "exec('rm -rf /')");
    }, /destructive script/);

    assert.strictEqual(
      validateProposedCodeSafeguards("src/clean.js", "const port = process.env.PORT || 5000;"),
      true
    );
  });

  // Run persistent Vector Store test suite
  const vsResults = await runVectorStoreTests();
  passed += vsResults.passed;
  failed += vsResults.failed;

  // Run Realtime Streaming (SSE) test suite
  const streamResults = await runRealtimeStreamingTests();
  passed += streamResults.passed;
  failed += streamResults.failed;

  // Run Role-Based Access Control (RBAC) test suite
  const rbacResults = await runRbacTests();
  passed += rbacResults.passed;
  failed += rbacResults.failed;

  await eventBus.close();

  console.log("\n-----------------------------------------");
  console.log(`Total Results: ${passed} passed, ${failed} failed.`);
  console.log("-----------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
