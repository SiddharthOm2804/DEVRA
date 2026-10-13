import * as vscode from "vscode";

/**
 * DEVRA / DevPilot Unified Status Bar State Interface
 */
export type DevraStatusState =
  | "disconnected"
  | "connecting"
  | "ready"
  | "auth_required"
  | "agent_running"
  | "agent_completed"
  | "agent_failed"
  | "agent_cancelled";

export interface StatusUpdateOptions {
  state: DevraStatusState;
  message?: string;
  step?: string;
  percent?: number;
  taskId?: string;
  error?: string;
}

/**
 * Production-ready VS Code Status Bar Item Manager for DEVRA
 * Manages visibility, icons, commands, sanitization, and state transitions.
 */
export class DevraStatusBarManager implements vscode.Disposable {
  private static instance: DevraStatusBarManager | null = null;
  private statusBarItem: vscode.StatusBarItem;
  private currentState: DevraStatusState = "disconnected";
  private activeTaskId: string | null = null;
  private revertTimeout: NodeJS.Timeout | null = null;
  private isDisposed = false;

  private constructor() {
    // Single persistent item with high priority (aligned to left)
    this.statusBarItem = vscode.window.createStatusBarItem(
      "devra.statusBar",
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.name = "DEVRA Platform Status";
    this.render();
    this.statusBarItem.show();
  }

  /**
   * Initializes or returns the singleton status bar manager
   */
  public static initialize(context?: vscode.ExtensionContext): DevraStatusBarManager {
    if (!DevraStatusBarManager.instance) {
      DevraStatusBarManager.instance = new DevraStatusBarManager();
      if (context) {
        context.subscriptions.push(DevraStatusBarManager.instance);
      }
    }
    return DevraStatusBarManager.instance;
  }

  public static getInstance(): DevraStatusBarManager {
    if (!DevraStatusBarManager.instance) {
      DevraStatusBarManager.instance = new DevraStatusBarManager();
    }
    return DevraStatusBarManager.instance;
  }

  /**
   * Updates status bar state with safe sanitization
   */
  public updateStatus(options: StatusUpdateOptions): void {
    if (this.isDisposed) return;

    // Discard stale updates from older tasks if a newer task is currently active
    if (
      this.activeTaskId &&
      options.taskId &&
      options.taskId !== this.activeTaskId &&
      this.currentState === "agent_running"
    ) {
      return;
    }

    if (this.revertTimeout) {
      clearTimeout(this.revertTimeout);
      this.revertTimeout = null;
    }

    this.currentState = options.state;

    if (options.state === "agent_running") {
      if (options.taskId) {
        this.activeTaskId = options.taskId;
      }
    } else if (
      options.state === "agent_completed" ||
      options.state === "agent_failed" ||
      options.state === "agent_cancelled"
    ) {
      // Revert to "ready" after 6 seconds of showing task outcome
      this.revertTimeout = setTimeout(() => {
        if (
          this.currentState === "agent_completed" ||
          this.currentState === "agent_failed" ||
          this.currentState === "agent_cancelled"
        ) {
          this.activeTaskId = null;
          this.updateStatus({ state: "ready" });
        }
      }, 6000);
    } else if (options.state === "ready" || options.state === "disconnected" || options.state === "auth_required") {
      this.activeTaskId = null;
    }

    this.render(options);
  }

  /**
   * Renders the status bar item text, tooltip, icon, and command according to current state
   */
  private render(options?: StatusUpdateOptions): void {
    const sanitize = (str?: string) => {
      if (!str) return "";
      // Strip potential tokens, secrets, or file paths
      return str
        .replace(/(Bearer\s+[A-Za-z0-9_\-.]+)/gi, "[REDACTED]")
        .replace(/(password|token|secret)\s*[:=]\s*[^\s]+/gi, "[REDACTED]")
        .slice(0, 100);
    };

    switch (this.currentState) {
      case "connecting":
        this.statusBarItem.text = "$(sync~spin) DEVRA: Connecting";
        this.statusBarItem.tooltip = "Connecting to DEVRA AI Platform...";
        this.statusBarItem.command = "devpilot.status";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;

      case "ready":
        this.statusBarItem.text = "$(check) DEVRA: Ready";
        this.statusBarItem.tooltip = "DEVRA AI Platform is online and ready. Click to open Assistant.";
        this.statusBarItem.command = "devpilot.openChat";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;

      case "auth_required":
        this.statusBarItem.text = "$(lock) DEVRA: Sign In";
        this.statusBarItem.tooltip = "Authentication required or token expired. Click to authenticate.";
        this.statusBarItem.command = "devpilot.setToken";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        this.statusBarItem.color = undefined;
        break;

      case "agent_running": {
        const stepDesc = options?.step ? ` (${sanitize(options.step)})` : "";
        const pctDesc = options?.percent !== undefined ? ` [${Math.min(100, Math.max(0, options.percent))}%]` : "";
        this.statusBarItem.text = `$(sync~spin) DEVRA: Agent Running${pctDesc}`;
        this.statusBarItem.tooltip = `DEVRA AI Agent Mode is actively planning or executing${stepDesc}. Click to view Agent Mode.`;
        this.statusBarItem.command = "devpilot.agentMode";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;
      }

      case "agent_completed":
        this.statusBarItem.text = "$(check-all) DEVRA: Task Complete";
        this.statusBarItem.tooltip = "Agent task finished successfully. Changes ready for preview.";
        this.statusBarItem.command = "devpilot.agentMode";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;

      case "agent_failed": {
        const errorMsg = options?.error ? `: ${sanitize(options.error)}` : "";
        this.statusBarItem.text = "$(error) DEVRA: Task Failed";
        this.statusBarItem.tooltip = `Agent task encountered an error${errorMsg}. Click to view details.`;
        this.statusBarItem.command = "devpilot.agentMode";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        this.statusBarItem.color = undefined;
        break;
      }

      case "agent_cancelled":
        this.statusBarItem.text = "$(stop) DEVRA: Task Cancelled";
        this.statusBarItem.tooltip = "Agent task was cancelled or rejected. Project files untouched.";
        this.statusBarItem.command = "devpilot.agentMode";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;

      case "disconnected":
      default:
        this.statusBarItem.text = "$(plug) DEVRA: Connect";
        this.statusBarItem.tooltip = "Disconnected from DEVRA. Click to reconnect.";
        this.statusBarItem.command = "devpilot.connect";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;
    }
  }

  public getCurrentState(): DevraStatusState {
    return this.currentState;
  }

  public getActiveTaskId(): string | null {
    return this.activeTaskId;
  }

  public getStatusBarItem(): vscode.StatusBarItem {
    return this.statusBarItem;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    if (this.revertTimeout) {
      clearTimeout(this.revertTimeout);
      this.revertTimeout = null;
    }
    this.statusBarItem.dispose();
    DevraStatusBarManager.instance = null;
  }
}
