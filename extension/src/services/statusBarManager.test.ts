import assert from "node:assert";

/**
 * Mock VS Code API for Extension Testing
 */
class MockThemeColor {
  constructor(public id: string) {}
}

class MockStatusBarItem {
  public id: string;
  public alignment: number;
  public priority: number;
  public name?: string;
  public text: string = "";
  public tooltip: string = "";
  public command?: string;
  public backgroundColor?: MockThemeColor;
  public color?: any;
  public isVisible = false;
  public isDisposed = false;

  constructor(id: string, alignment: number, priority: number) {
    this.id = id;
    this.alignment = alignment;
    this.priority = priority;
  }

  show() {
    this.isVisible = true;
  }

  hide() {
    this.isVisible = false;
  }

  dispose() {
    this.isDisposed = true;
  }
}

// Global mock state
let lastCreatedStatusBarItem: MockStatusBarItem | null = null;
const executedCommands: string[] = [];

const mockVscode = {
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  },
  ThemeColor: MockThemeColor,
  window: {
    createStatusBarItem: (id: string, alignment: number, priority: number) => {
      lastCreatedStatusBarItem = new MockStatusBarItem(id, alignment, priority);
      return lastCreatedStatusBarItem;
    }
  },
  commands: {
    executeCommand: async (cmd: string) => {
      executedCommands.push(cmd);
      return true;
    }
  }
};

export async function runStatusBarTests() {
  console.log("\n=========================================");
  console.log("  DEVRA VS Code Status Bar Unit Tests    ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res && typeof (res as any).then === "function") {
        return (res as any)
          .then(() => {
            console.log(`  ✓ [StatusBar] ${name}`);
            passed++;
          })
          .catch((err: any) => {
            console.error(`  ✗ [StatusBar] ${name}`);
            console.error(`    Error: ${err.message}`);
            failed++;
          });
      }
      console.log(`  ✓ [StatusBar] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [StatusBar] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // Register mock into Node's require cache before importing statusBarManager
  const Module = await import("module");
  const originalRequire = Module.prototype.require;
  (Module.prototype as any).require = function (path: string) {
    if (path === "vscode") {
      return mockVscode;
    }
    return originalRequire.apply(this, arguments as any);
  };

  const { DevraStatusBarManager } = await import("./statusBarManager.js");

  // 1. Initialization and Initial Disconnected State
  test("Status bar initializes once with Left alignment, priority 100, and Disconnected state", () => {
    const manager = DevraStatusBarManager.getInstance();
    assert.ok(manager, "DevraStatusBarManager must exist");
    assert.strictEqual(manager.getCurrentState(), "disconnected");

    const item = manager.getStatusBarItem();
    assert.ok(item, "Underlying vscode StatusBarItem must be initialized");
    assert.ok(item.text.includes("DEVRA: Connect"), "Expected $(plug) DEVRA: Connect in initial state");
    assert.strictEqual(item.command, "devpilot.connect");
  });

  // 2. Connecting State
  test("updateStatus to 'connecting' shows spinner and connects", () => {
    const manager = DevraStatusBarManager.getInstance();
    manager.updateStatus({ state: "connecting" });

    assert.strictEqual(manager.getCurrentState(), "connecting");
    const item = manager.getStatusBarItem();
    assert.ok(item.text.includes("DEVRA: Connecting"));
    assert.ok(item.text.includes("sync~spin"));
  });

  // 3. Ready State
  test("updateStatus to 'ready' shows check icon and points to chat command", () => {
    const manager = DevraStatusBarManager.getInstance();
    manager.updateStatus({ state: "ready" });

    assert.strictEqual(manager.getCurrentState(), "ready");
    const item = manager.getStatusBarItem();
    assert.ok(item.text.includes("DEVRA: Ready"));
    assert.strictEqual(item.command, "devpilot.openChat");
  });

  // 4. Auth Required State
  test("updateStatus to 'auth_required' prompts for token and sets warning color", () => {
    const manager = DevraStatusBarManager.getInstance();
    manager.updateStatus({ state: "auth_required" });

    assert.strictEqual(manager.getCurrentState(), "auth_required");
    const item = manager.getStatusBarItem();
    assert.ok(item.text.includes("DEVRA: Sign In"));
    assert.strictEqual(item.command, "devpilot.setToken");
    assert.ok(item.backgroundColor, "Warning background must be set for auth_required");
  });

  // 5. Agent Running with Safe Step Description and Clamped Percentage
  test("updateStatus to 'agent_running' tracks active task, percentage, and sanitizes secrets", () => {
    const manager = DevraStatusBarManager.getInstance();
    manager.updateStatus({
      state: "agent_running",
      taskId: "task-abc-123",
      step: "AST code analysis with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token",
      percent: 45
    });

    assert.strictEqual(manager.getCurrentState(), "agent_running");
    assert.strictEqual(manager.getActiveTaskId(), "task-abc-123");
    const item = manager.getStatusBarItem();
    assert.ok(item.text.includes("Agent Running [45%]"));
    assert.strictEqual(item.command, "devpilot.agentMode");
    // Ensure Bearer JWT is redacted from tooltip
    const tooltipStr = String(item.tooltip || "");
    assert.ok(!tooltipStr.includes("eyJhbGci"), "Secret JWT token must never appear in tooltip");
    assert.ok(tooltipStr.includes("[REDACTED]"), "Bearer token must be redacted in tooltip");
  });

  // 6. Stale Event Guard
  test("Stale events from previous task do not overwrite active task status", () => {
    const manager = DevraStatusBarManager.getInstance();
    // Active task is task-abc-123
    manager.updateStatus({
      state: "agent_running",
      taskId: "task-old-999",
      step: "Late event from old task",
      percent: 10
    });

    // Should remain on active task
    assert.strictEqual(manager.getActiveTaskId(), "task-abc-123");
    const item = manager.getStatusBarItem();
    assert.ok(item.text.includes("[45%]"), "Stale event must be ignored");
  });

  // 7. Agent Completed State
  test("updateStatus to 'agent_completed' displays completion icon", () => {
    const manager = DevraStatusBarManager.getInstance();
    manager.updateStatus({
      state: "agent_completed",
      taskId: "task-abc-123",
      message: "Plan ready"
    });

    assert.strictEqual(manager.getCurrentState(), "agent_completed");
    const item = manager.getStatusBarItem();
    assert.ok(item.text.includes("DEVRA: Task Complete"));
  });

  // 8. Agent Failed State
  test("updateStatus to 'agent_failed' applies error background and sanitizes error text", () => {
    const manager = DevraStatusBarManager.getInstance();
    manager.updateStatus({
      state: "agent_failed",
      taskId: "task-abc-123",
      error: "Connection failed with password=SecretKey123"
    });

    assert.strictEqual(manager.getCurrentState(), "agent_failed");
    const item = manager.getStatusBarItem();
    assert.ok(item.text.includes("DEVRA: Task Failed"));
    const tooltipErr = String(item.tooltip || "");
    assert.ok(!tooltipErr.includes("SecretKey123"), "Password must not be in tooltip");
    assert.ok(tooltipErr.includes("[REDACTED]"), "Password must be redacted");
  });

  // 9. Agent Cancelled State
  test("updateStatus to 'agent_cancelled' displays stop icon and retains project safe state", () => {
    const manager = DevraStatusBarManager.getInstance();
    manager.updateStatus({
      state: "agent_cancelled",
      taskId: "task-abc-123"
    });

    assert.strictEqual(manager.getCurrentState(), "agent_cancelled");
    const item = manager.getStatusBarItem();
    assert.ok(item.text.includes("DEVRA: Task Cancelled"));
  });

  // 10. Disposal and Cleanup
  test("dispose cleanly cleans up underlying VS Code status bar item and clears singleton", () => {
    const manager = DevraStatusBarManager.getInstance();
    const item = manager.getStatusBarItem();
    manager.dispose();

    assert.strictEqual((item as any).isDisposed, true, "Item must be marked disposed");
  });

  console.log("\n-----------------------------------------");
  console.log(`Total Results: ${passed} passed, ${failed} failed.`);
  console.log("-----------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }

  return { passed, failed };
}

// Auto-run if executed as main
if (typeof require !== "undefined" && require.main === module) {
  runStatusBarTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
