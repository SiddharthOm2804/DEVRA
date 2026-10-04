import * as vscode from "vscode";
import * as path from "path";
import { CodeContext } from "./apiService";

/**
 * Extracts selected editor text, detects active file, and determines workspace folder
 */
export function getActiveEditorContext(requireSelection = true): CodeContext | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("DevPilot: No active editor found. Open a file to analyze.");
    return null;
  }

  const document = editor.document;
  const selection = editor.selection;
  let code = document.getText(selection);

  if (!code.trim()) {
    if (requireSelection) {
      vscode.window.showWarningMessage("DevPilot: Please highlight a block of code in the editor to proceed.");
      return null;
    }
    // If no selection required, take the entire file content
    code = document.getText();
  }

  const filePath = document.uri.fsPath;
  const fileName = path.basename(filePath);
  const language = document.languageId || "javascript";

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const workspaceName = workspaceFolder ? workspaceFolder.name : "Standalone File";

  return {
    fileName,
    filePath,
    language,
    code,
    workspaceName
  };
}
