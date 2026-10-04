import * as vscode from "vscode";
import { ReviewResponse, ChatResponse } from "./apiService";

/**
 * Displays AI Code Review findings in a dedicated VS Code Webview Panel
 */
export function showReviewResultsPanel(
  title: string,
  fileName: string,
  review: NonNullable<ReviewResponse["review"]>
): void {
  const panel = vscode.window.createWebviewPanel(
    "devpilotReview",
    `DevPilot Review: ${fileName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  const severityColor =
    review.severity === "critical"
      ? "#f43f5e"
      : review.severity === "high"
      ? "#fbbf24"
      : review.severity === "low"
      ? "#34d399"
      : "#38bdf8";

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-editor-foreground, #cbd5e1);
      background-color: var(--vscode-editor-background, #080B11);
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 1px solid var(--vscode-panel-border, #1e293b);
      padding-bottom: 14px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .score {
      font-size: 26px;
      font-weight: 800;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .card {
      background: var(--vscode-editorWidget-background, #0F1420);
      border: 1px solid var(--vscode-editorWidget-border, #1e293b);
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 14px;
    }
    .card-title {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 6px;
      color: var(--vscode-editor-foreground, #fff);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    pre {
      background: #04060A;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 10px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      color: #34d399;
    }
    .btn {
      background: var(--vscode-button-background, #0284c7);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground, #0369a1);
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin: 0; font-size: 18px; color: #fff;">${title}</h2>
      <span style="font-family: monospace; font-size: 12px; color: #64748b;">File: ${fileName}</span>
    </div>
    <div style="text-align: right;">
      <span class="badge" style="background: ${severityColor}22; color: ${severityColor}; border: 1px solid ${severityColor}66;">
        ${review.severity.toUpperCase()}
      </span>
      <div class="score" style="color: ${severityColor};">${review.score}<span style="font-size: 14px; color: #64748b;"> / 100</span></div>
    </div>
  </div>

  <div class="card" style="border-left: 3px solid #38bdf8;">
    <div class="card-title" style="color: #38bdf8;">Executive Summary</div>
    <p style="margin: 0;">${review.summary}</p>
  </div>

  <h3 style="color: #fff; margin-top: 24px;">Flagged Issues (${review.issues.length})</h3>
  ${review.issues.map(issue => `
    <div class="card" style="border-left: 3px solid ${issue.severity === 'critical' ? '#f43f5e' : issue.severity === 'high' ? '#fbbf24' : '#38bdf8'};">
      <div class="card-title">
        <span>${issue.title}</span>
        <span class="badge" style="background: #1e293b; color: #94a3b8;">
          ${issue.line ? `Line ${issue.line}` : issue.type}
        </span>
      </div>
      <p style="margin: 4px 0 8px 0; color: #cbd5e1;">${issue.description}</p>
      <span style="font-size: 10px; font-family: monospace; color: #64748b;">Rule: ${issue.rule || 'code-quality'}</span>
    </div>
  `).join('')}

  ${review.suggestions.length > 0 ? `
    <h3 style="color: #fff; margin-top: 24px;">Actionable Fixes &amp; Patches (${review.suggestions.length})</h3>
    ${review.suggestions.map((sug, i) => `
      <div class="card" style="border-left: 3px solid #34d399;">
        <div class="card-title">
          <span>${sug.title}</span>
          <span class="badge" style="background: #064e3b; color: #34d399;">Impact: ${sug.impact}</span>
        </div>
        <p style="margin: 4px 0 8px 0;">${sug.description}</p>
        ${sug.codeSnippet ? `<pre>${sug.codeSnippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>` : ''}
      </div>
    `).join('')}
  ` : ''}
</body>
</html>`;
}

/**
 * Displays Explanation or Test Generation output in a VS Code Webview Panel
 */
export function showContentPanel(
  title: string,
  fileName: string,
  content: string,
  sourceReferences?: Array<{ fileName: string; filePath: string; lineRange: string; relevanceScore: number }>
): void {
  const panel = vscode.window.createWebviewPanel(
    "devpilotContent",
    `DevPilot: ${title}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  const formattedContent = content
    .replace(/```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/g, (_match, _lang, code) => {
      return `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    })
    .replace(/^### (.*$)/gim, '<h3 style="color: #38bdf8; margin-top: 18px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #fff; margin-top: 20px;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
    .replace(/\n\n/g, '<br/><br/>');

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-editor-foreground, #cbd5e1);
      background-color: var(--vscode-editor-background, #080B11);
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 1px solid var(--vscode-panel-border, #1e293b);
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    pre {
      background: #04060A;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      color: #34d399;
    }
    .citations {
      margin-top: 24px;
      padding: 12px;
      background: #0F1420;
      border: 1px solid #1e293b;
      border-radius: 8px;
    }
    .chip {
      display: inline-block;
      padding: 3px 8px;
      background: #1e293b;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      margin-right: 6px;
      margin-bottom: 6px;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0 0 4px 0; color: #fff;">${title}</h2>
    <span style="font-family: monospace; font-size: 12px; color: #64748b;">Context: ${fileName}</span>
  </div>

  <div style="font-size: 13px;">
    ${formattedContent}
  </div>

  ${sourceReferences && sourceReferences.length > 0 ? `
    <div class="citations">
      <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">
        Ground Truth Source Citations (${sourceReferences.length})
      </div>
      <div>
        ${sourceReferences.map(ref => `
          <span class="chip">
            &bull; ${ref.filePath} (Lines ${ref.lineRange}) [${ref.relevanceScore}%]
          </span>
        `).join('')}
      </div>
    </div>
  ` : ''}
</body>
</html>`;
}
