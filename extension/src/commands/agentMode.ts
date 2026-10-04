import * as vscode from "vscode";
import { ApiService, AgentSessionData, ProposedChange } from "../services/apiService";
import { DevPilotPreviewProvider } from "../services/previewProvider";

export async function agentModeCommand(): Promise<void> {
  const apiService = ApiService.getInstance();

  // 1. Ensure authenticated
  try {
    await apiService.ensureAuthenticated();
  } catch (err: any) {
    vscode.window.showErrorMessage(`DevPilot Authentication failed: ${err.message}`);
    return;
  }

  // 2. Fetch or detect repository
  let repositoryId = "6abff28b6c2cad13aa301fa6";
  try {
    const reposRes = await apiService.getRepositories();
    if (reposRes.repositories && reposRes.repositories.length > 0) {
      if (reposRes.repositories.length === 1) {
        repositoryId = reposRes.repositories[0]._id;
      } else {
        const selected = await vscode.window.showQuickPick(
          reposRes.repositories.map((r) => ({
            label: `$(repo) ${r.name}`,
            description: r.language,
            id: r._id
          })),
          { placeHolder: "Select target repository for DevPilot AI Agent" }
        );
        if (selected) {
          repositoryId = selected.id;
        }
      }
    }
  } catch {
    // Fallback to default repository
  }

  // 3. Prompt user for development goal
  const goalPrompt = await vscode.window.showInputBox({
    prompt: "DevPilot AI Agent Mode - Describe the task to plan and implement",
    placeHolder: "e.g., Add forgot password functionality, or Add JWT refresh token rotation",
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value || value.trim().length < 5) {
        return "Please enter a specific development request (at least 5 characters).";
      }
      return null;
    }
  });

  if (!goalPrompt) {
    return; // User canceled
  }

  // 4. Create Webview Panel immediately so user sees real-time progress
  const panel = vscode.window.createWebviewPanel(
    "devpilotAgentMode",
    `Agent: ${goalPrompt.slice(0, 28)}...`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  panel.webview.html = getLoadingHtml(goalPrompt, "Analyzing repository architecture and synthesizing implementation plan...");

  let currentSession: AgentSessionData | null = null;

  try {
    // 5. Repository analysis & Planning phase
    const planRes = await apiService.createAgentPlan(goalPrompt, repositoryId);
    if (!planRes.success || !planRes.session) {
      throw new Error(planRes.message || "Failed to create agent implementation plan.");
    }

    currentSession = planRes.session;
    panel.webview.html = getPlanHtml(currentSession);

    vscode.window.showInformationMessage(
      `DevPilot Agent: Implementation plan ready for "${goalPrompt}". Awaiting your approval.`,
      "Review Plan"
    );
  } catch (err: any) {
    panel.webview.html = getErrorHtml(goalPrompt, err.message);
    vscode.window.showErrorMessage(`DevPilot Agent Error: ${err.message}`);
    return;
  }

  // 6. Handle interactive actions from the Webview (Approve, Reject, View Diff, Apply)
  panel.webview.onDidReceiveMessage(async (message) => {
    if (!currentSession) return;

    switch (message.type) {
      case "approvePlan": {
        panel.webview.html = getLoadingHtml(
          currentSession.goalPrompt,
          "Plan approved! Generating proposed code changes, diff previews, and validating safeguards..."
        );

        try {
          const changeRes = await apiService.approveAgentPlan(currentSession._id);
          if (!changeRes.success || !changeRes.session) {
            throw new Error(changeRes.message || "Failed to generate proposed code changes.");
          }

          currentSession = changeRes.session;
          panel.webview.html = getDiffPreviewHtml(currentSession);

          vscode.window.showInformationMessage(
            `DevPilot Agent: Proposed code changes ready (${currentSession.proposedChanges.length} files). Review diffs before applying.`,
            "View Diffs"
          );
        } catch (err: any) {
          panel.webview.html = getErrorHtml(currentSession.goalPrompt, err.message);
          vscode.window.showErrorMessage(`DevPilot Agent Error: ${err.message}`);
        }
        break;
      }

      case "rejectPlan": {
        try {
          const res = await apiService.rejectAgentChanges(currentSession._id, "Plan rejected by user");
          if (res.session) currentSession = res.session;
          panel.webview.html = getCompletedHtml(currentSession, "rejected", "Implementation plan was rejected. No changes were made.");
          vscode.window.showInformationMessage("DevPilot Agent: Plan rejected. Project files remain untouched.");
        } catch (err: any) {
          vscode.window.showErrorMessage(`Error rejecting plan: ${err.message}`);
        }
        break;
      }

      case "openNativeDiff": {
        const filePath = message.filePath;
        const change = currentSession.proposedChanges.find((c) => c.filePath === filePath);
        if (!change) return;

        try {
          const previewProvider = DevPilotPreviewProvider.getInstance();

          // Original URI
          const origUri = vscode.Uri.parse(
            `${DevPilotPreviewProvider.scheme}:/original/${encodeURIComponent(filePath)}`
          );
          previewProvider.setContent(origUri, change.originalContent || "// New file (empty original)\n");

          // Proposed URI
          const propUri = vscode.Uri.parse(
            `${DevPilotPreviewProvider.scheme}:/proposed/${encodeURIComponent(filePath)}`
          );
          previewProvider.setContent(propUri, change.proposedContent);

          const title = `${filePath} (Original ↔ Proposed)`;
          await vscode.commands.executeCommand("vscode.diff", origUri, propUri, title);
        } catch (err: any) {
          vscode.window.showErrorMessage(`Could not open native diff editor: ${err.message}`);
        }
        break;
      }

      case "applyChanges": {
        // Confirmation dialog for safety
        const confirm = await vscode.window.showWarningMessage(
          `Apply ${currentSession.proposedChanges.length} proposed changes to your project? This will update your workspace files with safety snapshots.`,
          { modal: true },
          "Apply Changes",
          "Cancel"
        );

        if (confirm !== "Apply Changes") {
          return;
        }

        panel.webview.html = getLoadingHtml(
          currentSession.goalPrompt,
          "Applying changes safely to workspace and creating backup snapshots..."
        );

        try {
          // 1. Tell backend to mark applied & record backup snapshot
          const applyRes = await apiService.applyAgentChanges(currentSession._id);
          if (applyRes.session) currentSession = applyRes.session;

          // 2. Safely apply to local workspace files if workspace folder exists
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            const rootUri = workspaceFolders[0].uri;

            for (const change of currentSession.proposedChanges) {
              const fileUri = vscode.Uri.joinPath(rootUri, change.filePath);

              if (change.action === "delete") {
                try {
                  await vscode.workspace.fs.delete(fileUri, { useTrash: true });
                } catch {
                  // File may not exist yet
                }
              } else {
                // Ensure directory exists
                const dirUri = vscode.Uri.joinPath(fileUri, "..");
                await vscode.workspace.fs.createDirectory(dirUri);

                const enc = new TextEncoder();
                await vscode.workspace.fs.writeFile(fileUri, enc.encode(change.proposedContent));
              }
            }
          }

          panel.webview.html = getCompletedHtml(
            currentSession,
            "applied",
            "All proposed changes applied successfully! Reversible backup snapshots are preserved."
          );

          vscode.window.showInformationMessage(
            `DevPilot Agent: Changes successfully applied to ${currentSession.proposedChanges.length} files.`,
            "Open Changed Files"
          ).then((act) => {
            if (act === "Open Changed Files" && workspaceFolders && workspaceFolders.length > 0) {
              const firstChange = currentSession?.proposedChanges[0];
              if (firstChange) {
                const targetUri = vscode.Uri.joinPath(workspaceFolders[0].uri, firstChange.filePath);
                vscode.window.showTextDocument(targetUri);
              }
            }
          });
        } catch (err: any) {
          panel.webview.html = getErrorHtml(currentSession.goalPrompt, err.message);
          vscode.window.showErrorMessage(`Failed to apply changes: ${err.message}`);
        }
        break;
      }

      case "rejectChanges": {
        try {
          const res = await apiService.rejectAgentChanges(
            currentSession._id,
            "User rejected diff in preview"
          );
          if (res.session) currentSession = res.session;
          panel.webview.html = getCompletedHtml(
            currentSession,
            "rejected",
            "Proposed changes were discarded. Project files remain 100% untouched."
          );
          vscode.window.showInformationMessage(
            "DevPilot Agent: Changes discarded. Workspace untouched."
          );
        } catch (err: any) {
          vscode.window.showErrorMessage(`Error rejecting changes: ${err.message}`);
        }
        break;
      }
    }
  });
}

/**
 * Loading state HTML
 */
function getLoadingHtml(goal: string, statusMessage: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      background-color: var(--vscode-editor-background, #080B11);
      color: var(--vscode-editor-foreground, #cbd5e1);
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      text-align: center;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-radius: 50%;
      border-top-color: #38bdf8;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .goal-box {
      background: #0F1420;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px 18px;
      margin-bottom: 16px;
      font-family: monospace;
      color: #38bdf8;
      max-width: 500px;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2 style="margin: 0 0 10px 0; color: #fff;">DevPilot AI Agent Active</h2>
  <div class="goal-box">"${escapeHtml(goal)}"</div>
  <p style="color: #94a3b8; font-size: 13px;">${escapeHtml(statusMessage)}</p>
</body>
</html>`;
}

/**
 * Implementation Plan Webview HTML
 */
function getPlanHtml(session: AgentSessionData): string {
  const plan = session.plan;
  const riskColor =
    plan?.estimatedRisk === "high"
      ? "#f43f5e"
      : plan?.estimatedRisk === "medium"
      ? "#fbbf24"
      : "#34d399";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      background-color: var(--vscode-editor-background, #080B11);
      color: var(--vscode-editor-foreground, #cbd5e1);
      padding: 24px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 1px solid #1e293b;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: monospace;
    }
    .card {
      background: #0F1420;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 14px;
    }
    .step-card {
      background: #0C101A;
      border: 1px solid #1e293b;
      border-left: 3px solid #38bdf8;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .file-chip {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      background: #1e293b;
      color: #38bdf8;
      font-size: 11px;
      font-family: monospace;
      margin-right: 6px;
      margin-top: 4px;
    }
    .safeguards-box {
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 20px;
    }
    .safeguards-box ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
      color: #34d399;
      font-size: 12px;
    }
    .actions-bar {
      position: sticky;
      bottom: 0;
      background: #080B11;
      border-top: 1px solid #1e293b;
      padding: 16px 0 0 0;
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: #0284c7;
      color: #fff;
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: #334155;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">AI AGENT MODE &bull; PHASE 1: PLANNING</span>
        <h2 style="margin: 4px 0 6px 0; color: #fff;">${escapeHtml(session.goalPrompt)}</h2>
        <span style="font-family: monospace; font-size: 11px; color: #64748b;">Session ID: ${session._id}</span>
      </div>
      <div style="text-align: right;">
        <span class="badge" style="background: ${riskColor}22; color: ${riskColor}; border: 1px solid ${riskColor}66;">
          Risk: ${plan?.estimatedRisk || "low"}
        </span>
      </div>
    </div>
  </div>

  <!-- Plan Executive Summary -->
  <div class="card" style="border-left: 3px solid #38bdf8;">
    <div style="font-weight: 700; color: #38bdf8; margin-bottom: 6px; font-size: 13px;">Implementation Plan Overview</div>
    <p style="margin: 0; color: #e2e8f0;">${escapeHtml(plan?.summary || "Structured implementation plan generated.")}</p>
  </div>

  <!-- Affected Files -->
  <div class="card">
    <div style="font-weight: 700; color: #fff; margin-bottom: 8px;">Affected Target Files (${plan?.affectedFiles?.length || 0})</div>
    <div>
      ${(plan?.affectedFiles || []).map((f) => `<span class="file-chip">&bull; ${escapeHtml(f)}</span>`).join("")}
    </div>
  </div>

  <!-- Step by Step Plan -->
  <h3 style="color: #fff; margin: 20px 0 10px 0;">Execution Steps (${plan?.steps?.length || 0})</h3>
  ${(plan?.steps || []).map((s) => `
    <div class="step-card">
      <div class="step-header">
        <span style="font-weight: 700; color: #fff;">Step ${s.stepNumber}: ${escapeHtml(s.title)}</span>
        <span class="badge" style="background: #1e293b; color: #94a3b8;">${s.filesToTouch?.length || 0} Files</span>
      </div>
      <p style="margin: 4px 0 8px 0; color: #cbd5e1; font-size: 12px;">${escapeHtml(s.description)}</p>
      ${s.safetyCheck ? `<div style="font-size: 11px; color: #34d399; font-family: monospace;">🛡️ Safety check: ${escapeHtml(s.safetyCheck)}</div>` : ""}
    </div>
  `).join("")}

  <!-- Active Safeguards Verified -->
  <div class="safeguards-box">
    <div style="font-weight: 700; color: #34d399; font-size: 12px; display: flex; align-items: center; gap: 6px;">
      <span>🔒 DevPilot Safeguards Active</span>
    </div>
    <ul>
      <li>No automatic destructive operations (files will not be modified or deleted without explicit confirmation).</li>
      <li>Zero secrets exposure: credentials and sensitive keys remain in environment variables only.</li>
      <li>Strict validation: all code syntax is checked before application.</li>
      <li>Reversible changes: full backup snapshot taken prior to writing to disk.</li>
      <li>Human-in-the-loop control: User approves plan first, then approves diff preview second.</li>
    </ul>
  </div>

  <!-- User Approval Actions -->
  <div class="actions-bar">
    <button class="btn btn-primary" id="btnApprovePlan">
      <span>✓ Approve Plan &amp; Generate Code Diffs</span>
    </button>
    <button class="btn btn-secondary" id="btnRejectPlan">
      <span>✕ Reject Plan</span>
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('btnApprovePlan').addEventListener('click', () => {
      vscode.postMessage({ type: 'approvePlan' });
    });
    document.getElementById('btnRejectPlan').addEventListener('click', () => {
      vscode.postMessage({ type: 'rejectPlan' });
    });
  </script>
</body>
</html>`;
}

/**
 * Proposed Changes & Diff Preview Webview HTML
 */
function getDiffPreviewHtml(session: AgentSessionData): string {
  const changes = session.proposedChanges || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      background-color: var(--vscode-editor-background, #080B11);
      color: var(--vscode-editor-foreground, #cbd5e1);
      padding: 24px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 1px solid #1e293b;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: monospace;
    }
    .diff-card {
      background: #0F1420;
      border: 1px solid #1e293b;
      border-radius: 8px;
      margin-bottom: 18px;
      overflow: hidden;
    }
    .diff-card-header {
      background: #0C101A;
      padding: 12px 16px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .diff-pre {
      margin: 0;
      padding: 12px 16px;
      background: #04060A;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
      max-height: 380px;
    }
    .diff-line-add {
      color: #34d399;
      background: rgba(16, 185, 129, 0.12);
      display: block;
      padding: 0 4px;
    }
    .diff-line-del {
      color: #f43f5e;
      background: rgba(244, 63, 94, 0.12);
      display: block;
      padding: 0 4px;
    }
    .diff-line-info {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      display: block;
      padding: 0 4px;
    }
    .diff-line-normal {
      color: #94a3b8;
      display: block;
      padding: 0 4px;
    }
    .actions-bar {
      position: sticky;
      bottom: 0;
      background: #080B11;
      border-top: 1px solid #1e293b;
      padding: 16px 0 0 0;
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-apply {
      background: #10b981;
      color: #fff;
    }
    .btn-apply:hover {
      background: #059669;
    }
    .btn-inspect {
      background: #0284c7;
      color: #fff;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .btn-inspect:hover {
      background: #0369a1;
    }
    .btn-reject {
      background: #1e293b;
      color: #cbd5e1;
    }
    .btn-reject:hover {
      background: #334155;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">AI AGENT MODE &bull; PHASE 2: DIFF PREVIEW &amp; APPROVAL</span>
        <h2 style="margin: 4px 0 6px 0; color: #fff;">Proposed Changes Preview</h2>
        <span style="font-family: monospace; font-size: 11px; color: #64748b;">Goal: "${escapeHtml(session.goalPrompt)}"</span>
      </div>
      <div style="text-align: right;">
        <span class="badge" style="background: #38bdf822; color: #38bdf8; border: 1px solid #38bdf866;">
          ${changes.length} Files Ready
        </span>
      </div>
    </div>
  </div>

  <p style="color: #94a3b8; font-size: 12px; margin-bottom: 20px;">
    Review the proposed code diffs below or click <strong>Inspect in VS Code</strong> to open the full side-by-side native diff editor. No files are modified until you click <strong>Apply Changes</strong>.
  </p>

  <!-- Changed Files List -->
  ${changes.map((c, idx) => {
    const actionColor = c.action === "create" ? "#34d399" : c.action === "delete" ? "#f43f5e" : "#38bdf8";
    return `
      <div class="diff-card">
        <div class="diff-card-header">
          <div>
            <span class="badge" style="background: ${actionColor}22; color: ${actionColor}; border: 1px solid ${actionColor}66; margin-right: 8px;">
              ${c.action.toUpperCase()}
            </span>
            <strong style="color: #fff; font-family: monospace; font-size: 13px;">${escapeHtml(c.filePath)}</strong>
            <span style="color: #64748b; font-size: 11px; margin-left: 8px;">&bull; ${escapeHtml(c.summary || "")}</span>
          </div>
          <button class="btn btn-inspect" onclick="openNativeDiff('${escapeJs(c.filePath)}')">
            Inspect Side-by-Side
          </button>
        </div>
        <pre class="diff-pre"><code>${formatDiff(c.diff)}</code></pre>
      </div>
    `;
  }).join("")}

  <!-- Apply / Reject Bar -->
  <div class="actions-bar">
    <button class="btn btn-apply" id="btnApplyChanges">
      <span>🛡️ Apply Changes to Project</span>
    </button>
    <button class="btn btn-reject" id="btnRejectChanges">
      <span>✕ Reject &amp; Discard Changes</span>
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function openNativeDiff(filePath) {
      vscode.postMessage({ type: 'openNativeDiff', filePath: filePath });
    }

    document.getElementById('btnApplyChanges').addEventListener('click', () => {
      vscode.postMessage({ type: 'applyChanges' });
    });

    document.getElementById('btnRejectChanges').addEventListener('click', () => {
      vscode.postMessage({ type: 'rejectChanges' });
    });
  </script>
</body>
</html>`;
}

/**
 * Completed HTML (Applied or Rejected)
 */
function getCompletedHtml(session: AgentSessionData, status: "applied" | "rejected", message: string): string {
  const isApplied = status === "applied";
  const color = isApplied ? "#34d399" : "#f43f5e";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      background-color: var(--vscode-editor-background, #080B11);
      color: var(--vscode-editor-foreground, #cbd5e1);
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      text-align: center;
    }
    .icon-box {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: ${color}15;
      border: 1px solid ${color}40;
      color: ${color};
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .card {
      background: #0F1420;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 16px;
      max-width: 500px;
      text-align: left;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="icon-box">${isApplied ? "✓" : "✕"}</div>
  <h2 style="margin: 0 0 6px 0; color: #fff;">${isApplied ? "Changes Applied Safely" : "Changes Discarded"}</h2>
  <p style="color: #94a3b8; font-size: 13px; max-width: 480px;">${escapeHtml(message)}</p>

  <div class="card">
    <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-bottom: 6px;">SESSION SUMMARY</div>
    <div style="color: #fff; font-weight: 600; margin-bottom: 4px;">Goal: "${escapeHtml(session.goalPrompt)}"</div>
    <div style="font-size: 12px; color: #94a3b8;">Status: <strong style="color: ${color}; text-transform: uppercase;">${session.status}</strong></div>
    ${isApplied ? `<div style="font-size: 12px; color: #34d399; margin-top: 6px;">Reversible backup snapshot saved. Files in workspace updated.</div>` : ""}
  </div>
</body>
</html>`;
}

/**
 * Error HTML
 */
function getErrorHtml(goal: string, errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      background-color: var(--vscode-editor-background, #080B11);
      color: var(--vscode-editor-foreground, #cbd5e1);
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      text-align: center;
    }
    .icon-box {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.4);
      color: #f43f5e;
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .error-box {
      background: #0F1420;
      border: 1px solid rgba(244, 63, 94, 0.3);
      border-radius: 8px;
      padding: 14px 18px;
      color: #fca5a5;
      font-family: monospace;
      font-size: 12px;
      max-width: 500px;
      word-break: break-word;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="icon-box">⚠️</div>
  <h2 style="margin: 0 0 6px 0; color: #fff;">Agent Execution Failed</h2>
  <p style="color: #94a3b8; font-size: 13px; margin-bottom: 14px;">"${escapeHtml(goal)}"</p>
  <div class="error-box">${escapeHtml(errorMessage)}</div>
</body>
</html>`;
}

/**
 * Helper to escape HTML entities
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Helper to escape strings for JS function parameters
 */
function escapeJs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Format raw unified diff to HTML lines with syntax colors
 */
function formatDiff(diffText: string): string {
  if (!diffText) return `<span class="diff-line-normal">// No diff detected</span>`;

  return diffText
    .split("\n")
    .map((line) => {
      const escaped = escapeHtml(line);
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return `<span class="diff-line-add">${escaped}</span>`;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        return `<span class="diff-line-del">${escaped}</span>`;
      } else if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
        return `<span class="diff-line-info">${escaped}</span>`;
      } else {
        return `<span class="diff-line-normal">${escaped}</span>`;
      }
    })
    .join("");
}
