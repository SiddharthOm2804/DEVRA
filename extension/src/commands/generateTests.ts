import * as vscode from "vscode";
import { ApiService } from "../services/apiService";
import { getActiveEditorContext } from "../services/editorContext";
import { showContentPanel } from "../services/resultViewer";

export async function generateTestsCommand(): Promise<void> {
  const ctx = getActiveEditorContext(true);
  if (!ctx) return;

  const apiService = ApiService.getInstance();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `DevPilot: Synthesizing unit tests for ${ctx.fileName}...`,
      cancellable: false
    },
    async () => {
      try {
        const response = await apiService.generateTests(ctx);

        if (response.success && response.message) {
          showContentPanel(
            `Unit Tests: ${ctx.fileName}`,
            ctx.fileName,
            response.message.content,
            response.sourceReferences || response.message.sourceReferences
          );

          // Extract code snippet from response if available
          const testCode = response.codeSnippet || response.message.content;
          const action = await vscode.window.showInformationMessage(
            `DevPilot: Generated unit test suite for ${ctx.fileName}`,
            "Open New Test File",
            "Dismiss"
          );

          if (action === "Open New Test File") {
            const ext = ctx.fileName.includes(".") ? ctx.fileName.split(".").pop() : "ts";
            const doc = await vscode.workspace.openTextDocument({
              content: testCode,
              language: ctx.language || "typescript"
            });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
          }
        } else {
          vscode.window.showErrorMessage("DevPilot: Test generation failed on backend.");
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`DevPilot Error: ${err.message}`);
      }
    }
  );
}
