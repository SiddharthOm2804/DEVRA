import * as vscode from "vscode";

/**
 * TextDocumentContentProvider for virtual preview documents (used in native VS Code diff views)
 */
export class DevPilotPreviewProvider implements vscode.TextDocumentContentProvider {
  public static readonly scheme = "devpilot-preview";
  private static instance: DevPilotPreviewProvider;

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChange = this._onDidChange.event;

  private contents = new Map<string, string>();

  public static getInstance(): DevPilotPreviewProvider {
    if (!DevPilotPreviewProvider.instance) {
      DevPilotPreviewProvider.instance = new DevPilotPreviewProvider();
    }
    return DevPilotPreviewProvider.instance;
  }

  public setContent(uri: vscode.Uri, content: string): void {
    this.contents.set(uri.toString(), content);
    this._onDidChange.fire(uri);
  }

  public provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) || "";
  }
}
