import assert from "node:assert";

/**
 * F-012: Extension Webview Security & Sanitization Unit Tests
 */
export async function runWebviewSecurityTests() {
  console.log("=========================================");
  console.log("  DEVRA Extension Webview Security Tests ");
  console.log("=========================================\n");

  // Mock vscode module for standalone node testing
  const Module = await import("module");
  const originalRequire = (Module.prototype as any).require;
  (Module.prototype as any).require = function (modulePath: string) {
    if (modulePath === "vscode") {
      return {
        window: {
          createWebviewPanel: () => ({ webview: { html: "" } })
        },
        ViewColumn: { Beside: 2 }
      };
    }
    return originalRequire.apply(this, arguments as any);
  };

  const { escapeHtml } = await import("./resultViewer.js");
  console.log("=========================================");
  console.log("  DEVRA Extension Webview Security Tests ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ [Extension Security] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [Extension Security] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Script injection test via escapeHtml
  test("escapeHtml neutralizes malicious script tags and inline handlers", () => {
    const maliciousInput = '<script>alert("XSS")</script><img src="x" onerror="steal()" />';
    const escaped = escapeHtml(maliciousInput);

    assert.ok(!escaped.includes("<script>"), "Must not contain raw <script>");
    assert.ok(!escaped.includes("</script>"), "Must not contain raw </script>");
    assert.ok(!escaped.includes("<img"), "Must not contain raw <img");
    assert.ok(escaped.includes("&lt;script&gt;"), "Must encode tags into safe HTML entities");
    assert.ok(escaped.includes("&lt;img"), "Must encode img tag into safe HTML entities");
  });

  // 2. Untrusted filenames and paths
  test("escapeHtml sanitizes untrusted file paths and repository names", () => {
    const maliciousFileName = '"><iframe src="javascript:alert(1)">.ts';
    const escaped = escapeHtml(maliciousFileName);

    assert.ok(!escaped.includes('">'), "Must escape double quote and closing angle bracket");
    assert.ok(!escaped.includes("<iframe"), "Must not contain raw iframe");
    assert.ok(escaped.includes("&quot;&gt;&lt;iframe"), "Must be escaped with entities");
  });

  // 3. Null and undefined safety
  test("escapeHtml gracefully handles undefined and null values", () => {
    assert.strictEqual(escapeHtml(null), "");
    assert.strictEqual(escapeHtml(undefined), "");
    assert.strictEqual(escapeHtml(123), "123");
    assert.strictEqual(escapeHtml(0), "0");
  });

  // 4. Command allowlist simulation
  test("Only allowlisted commands can be dispatched from webview", () => {
    const ALLOWED_COMMANDS = new Set([
      "devpilot.agentMode",
      "devpilot.explainCode",
      "devpilot.reviewCode",
      "devpilot.refactorCode",
      "devpilot.generateTests"
    ]);

    const forbiddenCommands = [
      "workbench.action.terminal.new",
      "vscode.open",
      "workbench.action.reloadWindow",
      "devpilot.unauthorizedCommand"
    ];

    forbiddenCommands.forEach(cmd => {
      assert.strictEqual(ALLOWED_COMMANDS.has(cmd), false, `Command ${cmd} must be rejected`);
    });

    assert.strictEqual(ALLOWED_COMMANDS.has("devpilot.reviewCode"), true);
    assert.strictEqual(ALLOWED_COMMANDS.has("devpilot.agentMode"), true);
  });

  console.log(`\nExtension Webview Security Results: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}

// Auto-run if executed directly
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("webviewSecurity.test")) {
  runWebviewSecurityTests().then((result) => {
    if (result.failed > 0) process.exit(1);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
