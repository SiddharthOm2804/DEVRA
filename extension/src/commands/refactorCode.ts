import * as vscode from "vscode";
import { ApiService } from "../services/apiService";
import { getActiveEditorContext } from "../services/editorContext";
import { showReviewResultsPanel } from "../services/resultViewer";

export async function refactorCodeCommand(): Promise<void> {
  const ctx = getActiveEditorContext(true);
  if (!ctx) return;

  const instruction = await vscode.window.showInputBox({
    prompt: "Enter refactoring instruction for DevPilot",
    placeHolder: "e.g., Optimize memory, convert to async/await, extract modular functions"
  });

  const apiService = ApiService.getInstance();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `DevPilot: Generating refactoring patches for ${ctx.fileName}...`,
      cancellable: false
    },
    async () => {
      try {
        const response = await apiService.refactorCode(ctx, instruction);

        if (response.success && response.review) {
          showReviewResultsPanel(
            `Refactoring: ${ctx.fileName}`,
            ctx.fileName,
            response.review
          );

          // If there's a direct code replacement suggestion, offer to apply
          const firstSuggestion = response.review.suggestions?.[0];
          if (firstSuggestion?.codeSnippet) {
            const action = await vscode.window.showInformationMessage(
              `DevPilot generated refactored code: "${firstSuggestion.title}"`,
              "Apply to Selection",
              "View in Panel"
            );

            if (action === "Apply to Selection") {
              const editor = vscode.window.activeTextEditor;
              if (editor) {
                editor.edit((editBuilder) => {
                  editBuilder.replace(editor.selection, firstSuggestion.codeSnippet);
                });
                vscode.window.showInformationMessage("DevPilot: Refactored patch applied successfully!");
              }
            }
          }
        } else {
          vscode.window.showErrorMessage("DevPilot: Failed to generate refactoring from backend.");
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`DevPilot Error: ${err.message}`);
      }
    }
  );
}
