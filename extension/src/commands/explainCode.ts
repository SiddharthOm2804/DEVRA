import * as vscode from "vscode";
import { ApiService } from "../services/apiService";
import { getActiveEditorContext } from "../services/editorContext";
import { showContentPanel } from "../services/resultViewer";

export async function explainCodeCommand(): Promise<void> {
  const ctx = getActiveEditorContext(true);
  if (!ctx) return;

  const apiService = ApiService.getInstance();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `DevPilot: Analyzing and explaining ${ctx.fileName}...`,
      cancellable: false
    },
    async () => {
      try {
        const response = await apiService.explainCode(ctx);

        if (response.success && response.message) {
          showContentPanel(
            `Code Explanation: ${ctx.fileName}`,
            ctx.fileName,
            response.message.content,
            response.sourceReferences || response.message.sourceReferences
          );
        } else {
          vscode.window.showErrorMessage("DevPilot: Failed to generate code explanation from backend.");
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`DevPilot Error: ${err.message}`);
      }
    }
  );
}
