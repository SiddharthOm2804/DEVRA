import * as vscode from "vscode";
import { ApiService } from "./services/apiService";
import { explainCodeCommand } from "./commands/explainCode";
import { reviewCodeCommand } from "./commands/reviewCode";
import { refactorCodeCommand } from "./commands/refactorCode";
import { generateTestsCommand } from "./commands/generateTests";
import { openChatCommand } from "./commands/openChat";
import { agentModeCommand } from "./commands/agentMode";
import { DevPilotSidebarProvider } from "./providers/chatProvider";
import { DevPilotPreviewProvider } from "./services/previewProvider";
import { DevraStatusBarManager } from "./services/statusBarManager";

/**
 * Activates the DevPilot extension
 * @param context VS Code Extension Context
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log("Activating DevPilot AI Developer Platform extension...");

  // 1. Initialize ApiService singleton with secure secret storage
  const apiService = ApiService.initialize(context.secrets);

  // 2. Initialize persistent Status Bar Manager
  const statusBarManager = DevraStatusBarManager.initialize(context);

  // 3. Register virtual document provider for diff previews
  const previewProvider = DevPilotPreviewProvider.getInstance();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      DevPilotPreviewProvider.scheme,
      previewProvider
    )
  );

  // 4. Register DevPilot Sidebar Webview Provider
  const sidebarProvider = new DevPilotSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DevPilotSidebarProvider.viewType,
      sidebarProvider
    )
  );

  // 5. Register the Required Commands
  const explainDisposable = vscode.commands.registerCommand(
    "devpilot.explainCode",
    explainCodeCommand
  );

  const reviewDisposable = vscode.commands.registerCommand(
    "devpilot.reviewCode",
    reviewCodeCommand
  );

  const refactorDisposable = vscode.commands.registerCommand(
    "devpilot.refactorCode",
    refactorCodeCommand
  );

  const testsDisposable = vscode.commands.registerCommand(
    "devpilot.generateTests",
    generateTestsCommand
  );

  const chatDisposable = vscode.commands.registerCommand(
    "devpilot.openChat",
    openChatCommand
  );

  const agentDisposable = vscode.commands.registerCommand(
    "devpilot.agentMode",
    agentModeCommand
  );

  // 6. Register Utility Commands (Status, Connect, & Token Management)
  const connectDisposable = vscode.commands.registerCommand(
    "devpilot.connect",
    async () => {
      statusBarManager.updateStatus({ state: "connecting" });
      try {
        const health = await apiService.checkHealth();
        const token = await apiService.getToken();
        if (!token) {
          statusBarManager.updateStatus({ state: "auth_required" });
          vscode.window.showInformationMessage("DevPilot: Connected! Authentication token needed for AI capabilities.", "Sign In").then((action) => {
            if (action === "Sign In") {
              vscode.commands.executeCommand("devpilot.setToken");
            }
          });
        } else {
          statusBarManager.updateStatus({ state: "ready" });
          vscode.window.showInformationMessage(
            `DevPilot Platform: Connected to ${apiService.getApiUrl()} (${health.service})`
          );
        }
        sidebarProvider.refreshStatus();
      } catch (err: any) {
        statusBarManager.updateStatus({ state: "disconnected" });
        vscode.window.showErrorMessage(
          `DevPilot Platform: Could not connect to backend. Ensure server is running on port 5000.`
        );
      }
    }
  );

  const statusDisposable = vscode.commands.registerCommand(
    "devpilot.status",
    async () => {
      vscode.commands.executeCommand("devpilot.connect");
    }
  );

  const setTokenDisposable = vscode.commands.registerCommand(
    "devpilot.setToken",
    async () => {
      const token = await vscode.window.showInputBox({
        prompt: "Enter DevPilot JWT Authentication Token",
        password: true,
        placeHolder: "Bearer token..."
      });
      if (token) {
        await apiService.setToken(token);
        statusBarManager.updateStatus({ state: "ready" });
        vscode.window.showInformationMessage(
          "DevPilot: Authentication token saved securely in VS Code Keychain."
        );
      }
    }
  );

  // Also support legacy/alias commands for backward compatibility
  const legacyAliases = [
    vscode.commands.registerCommand("devra.status", () => vscode.commands.executeCommand("devpilot.status")),
    vscode.commands.registerCommand("devra.connect", () => vscode.commands.executeCommand("devpilot.connect")),
    vscode.commands.registerCommand("devra.agentMode", () => vscode.commands.executeCommand("devpilot.agentMode")),
    vscode.commands.registerCommand("devra.explainCode", () => vscode.commands.executeCommand("devpilot.explainCode")),
    vscode.commands.registerCommand("devra.reviewCode", () => vscode.commands.executeCommand("devpilot.reviewCode")),
    vscode.commands.registerCommand("devra.refactorCode", () => vscode.commands.executeCommand("devpilot.refactorCode")),
    vscode.commands.registerCommand("devra.generateTests", () => vscode.commands.executeCommand("devpilot.generateTests"))
  ];

  context.subscriptions.push(
    explainDisposable,
    reviewDisposable,
    refactorDisposable,
    testsDisposable,
    chatDisposable,
    agentDisposable,
    connectDisposable,
    statusDisposable,
    setTokenDisposable,
    ...legacyAliases
  );

  // Asynchronously verify backend connectivity without blocking extension activation
  apiService.checkHealth().then(async () => {
    const token = await apiService.getToken();
    if (!token) {
      statusBarManager.updateStatus({ state: "auth_required" });
    } else {
      statusBarManager.updateStatus({ state: "ready" });
    }
  }).catch(() => {
    statusBarManager.updateStatus({ state: "disconnected" });
  });

  console.log("DevPilot extension initialized successfully.");
}

/**
 * Deactivates the DevPilot extension
 */
export function deactivate(): void {
  console.log("DevPilot extension deactivated.");
}
