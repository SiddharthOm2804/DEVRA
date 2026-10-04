import * as vscode from "vscode";
import { ApiService } from "../services/apiService";
import { getActiveEditorContext } from "../services/editorContext";
import { showReviewResultsPanel } from "../services/resultViewer";

export async function reviewCodeCommand(): Promise<void> {
  const ctx = getActiveEditorContext(false); // Can review selected block or entire active file
  if (!ctx) return;

  const apiService = ApiService.getInstance();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `DevPilot: Reviewing AST security & quality for ${ctx.fileName}...`,
      cancellable: false
    },
    async () => {
      try {
        const response = await apiService.reviewCode(ctx);

        if (response.success && response.review) {
          showReviewResultsPanel(
            `AI Review: ${ctx.fileName}`,
            ctx.fileName,
            response.review
          );

          vscode.window.showInformationMessage(
            `DevPilot: ${ctx.fileName} scored ${response.review.score}/100 with ${response.review.issues.length} issue(s) flagged.`
          );
        } else {
          vscode.window.showErrorMessage("DevPilot: Review generation failed on backend.");
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`DevPilot Error: ${err.message}`);
      }
    }
  );
}
