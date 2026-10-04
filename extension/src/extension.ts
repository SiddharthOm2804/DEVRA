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

/**
 * Activates the DevPilot extension
 * @param context VS Code Extension Context
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log("Activating DevPilot AI Developer Platform extension...");

  // 1. Initialize ApiService singleton with secure secret storage
  const apiService = ApiService.initialize(context.secrets);

  // 2. Register virtual document provider for diff previews
  const previewProvider = DevPilotPreviewProvider.getInstance();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      DevPilotPreviewProvider.scheme,
      previewProvider
    )
  );

  // 3. Register DevPilot Sidebar Webview Provider
  const sidebarProvider = new DevPilotSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DevPilotSidebarProvider.viewType,
      sidebarProvider
    )
  );

  // 3. Register the 5 Required Commands
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

  // 4. Register Utility Commands (Status & Token Management)
  const statusDisposable = vscode.commands.registerCommand(
    "devpilot.status",
    async () => {
      try {
        const health = await apiService.checkHealth();
        vscode.window.showInformationMessage(
          `DevPilot Platform: Online at ${apiService.getApiUrl()} (${health.service})`
        );
        sidebarProvider.refreshStatus();
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `DevPilot Platform: Disconnected. ${err.message}`
        );
      }
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
        vscode.window.showInformationMessage(
          "DevPilot: Authentication token saved securely in VS Code Keychain."
        );
      }
    }
  );

  // Also support legacy/alias commands for backward compatibility
  const legacyAliases = [
    vscode.commands.registerCommand("devra.status", () => vscode.commands.executeCommand("devpilot.status")),
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
    statusDisposable,
    setTokenDisposable,
    ...legacyAliases
  );

  console.log("DevPilot extension initialized successfully.");
}

/**
 * Deactivates the DevPilot extension
 */
export function deactivate(): void {
  console.log("DevPilot extension deactivated.");
}
