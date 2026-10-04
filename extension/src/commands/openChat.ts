import * as vscode from "vscode";
import { ApiService } from "../services/apiService";
import { showContentPanel } from "../services/resultViewer";

export async function openChatCommand(): Promise<void> {
  // 1. Try focusing the DevPilot sidebar
  try {
    await vscode.commands.executeCommand("devpilot.sidebarView.focus");
  } catch {
    // Fallback: prompt for input directly in command palette
    const prompt = await vscode.window.showInputBox({
      prompt: "DevPilot Codebase Chat",
      placeHolder: "e.g., Where is authentication implemented? / Explain the request flow."
    });

    if (!prompt) return;

    const apiService = ApiService.getInstance();
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "DevPilot: Querying codebase intelligence...",
        cancellable: false
      },
      async () => {
        try {
          const response = await apiService.sendChatMessage(prompt);
          if (response.success && response.message) {
            showContentPanel(
              "Codebase Chat",
              "Repository Context",
              response.message.content,
              response.sourceReferences || response.message.sourceReferences
            );
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`DevPilot Chat Error: ${err.message}`);
        }
      }
    );
  }
}
