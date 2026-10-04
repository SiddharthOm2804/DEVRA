import * as vscode from "vscode";
import { ApiService } from "../services/apiService";

export class DevPilotSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "devpilot.sidebarView";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Listen to messages from the webview UI
    webviewView.webview.onDidReceiveMessage(async (data) => {
      const apiService = ApiService.getInstance();

      switch (data.type) {
        case "executeCommand": {
          vscode.commands.executeCommand(data.command);
          break;
        }

        case "sendMessage": {
          const messageText = data.text;
          if (!messageText || !messageText.trim()) return;

          try {
            // Post pending state to webview
            webviewView.webview.postMessage({
              type: "addMessage",
              message: { role: "user", content: messageText }
            });

            webviewView.webview.postMessage({ type: "setLoading", loading: true });

            const response = await apiService.sendChatMessage(messageText);

            if (response.success && response.message) {
              webviewView.webview.postMessage({
                type: "addMessage",
                message: {
                  role: "assistant",
                  content: response.message.content,
                  sourceReferences: response.sourceReferences || response.message.sourceReferences
                }
              });
            } else {
              webviewView.webview.postMessage({
                type: "addMessage",
                message: {
                  role: "assistant",
                  content: "Sorry, I could not retrieve an answer from the codebase."
                }
              });
            }
          } catch (err: any) {
            webviewView.webview.postMessage({
              type: "addMessage",
              message: {
                role: "assistant",
                content: `⚠️ DevPilot Error: ${err.message}`
              }
            });
          } finally {
            webviewView.webview.postMessage({ type: "setLoading", loading: false });
          }
          break;
        }

        case "checkStatus": {
          try {
            const health = await apiService.checkHealth();
            webviewView.webview.postMessage({
              type: "statusResult",
              connected: health.status === "ok",
              url: apiService.getApiUrl()
            });
          } catch (err: any) {
            webviewView.webview.postMessage({
              type: "statusResult",
              connected: false,
              url: apiService.getApiUrl(),
              error: err.message
            });
          }
          break;
        }

        case "setToken": {
          const token = await vscode.window.showInputBox({
            prompt: "Enter DevPilot JWT Token or API Secret",
            password: true,
            placeHolder: "Bearer token..."
          });
          if (token) {
            await apiService.setToken(token);
            vscode.window.showInformationMessage("DevPilot: Authentication token saved securely.");
            webviewView.webview.postMessage({ type: "tokenSaved" });
          }
          break;
        }
      }
    });

    // Send initial status check
    setTimeout(() => {
      this.refreshStatus();
    }, 500);
  }

  public async refreshStatus(): Promise<void> {
    if (!this._view) return;
    const apiService = ApiService.getInstance();
    try {
      const health = await apiService.checkHealth();
      this._view.webview.postMessage({
        type: "statusResult",
        connected: health.status === "ok",
        url: apiService.getApiUrl()
      });
    } catch (err: any) {
      this._view.webview.postMessage({
        type: "statusResult",
        connected: false,
        url: apiService.getApiUrl(),
        error: err.message
      });
    }
  }

  private _getHtmlForWebview(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevPilot</title>
  <style>
    * { box-sizing: border-box; }
    body {
      padding: 10px;
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: var(--vscode-font-size, 12px);
      color: var(--vscode-foreground, #cbd5e1);
      background-color: var(--vscode-sideBar-background, #080B11);
      display: flex;
      flex-col: column;
      height: 100vh;
      margin: 0;
      overflow: hidden;
    }
    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }
    .header {
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border, #1e293b);
      margin-bottom: 8px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: #0f172a;
      border: 1px solid #1e293b;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .status-dot.online { background: #34d399; box-shadow: 0 0 6px #34d399; }
    .status-dot.offline { background: #f43f5e; }
    
    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
    }
    .action-btn {
      background: var(--vscode-button-secondaryBackground, #0f172a);
      color: var(--vscode-button-secondaryForeground, #cbd5e1);
      border: 1px solid var(--vscode-panel-border, #1e293b);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 11px;
      cursor: pointer;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .action-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #1e293b);
      color: #fff;
    }
    
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .msg {
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.5;
    }
    .msg.user {
      background: var(--vscode-button-background, #0284c7);
      color: #fff;
      align-self: flex-end;
      max-width: 90%;
    }
    .msg.assistant {
      background: var(--vscode-editorWidget-background, #0F1420);
      border: 1px solid var(--vscode-editorWidget-border, #1e293b);
      color: var(--vscode-editor-foreground, #e2e8f0);
      align-self: flex-start;
      max-width: 95%;
    }
    .citation-chip {
      display: inline-block;
      font-family: monospace;
      font-size: 10px;
      padding: 2px 5px;
      background: #1e293b;
      border-radius: 3px;
      color: #38bdf8;
      margin-top: 4px;
      margin-right: 4px;
    }
    
    .input-box {
      border-top: 1px solid var(--vscode-panel-border, #1e293b);
      padding-top: 8px;
      display: flex;
      gap: 6px;
    }
    input[type="text"] {
      flex: 1;
      background: var(--vscode-input-background, #04060A);
      color: var(--vscode-input-foreground, #fff);
      border: 1px solid var(--vscode-input-border, #1e293b);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11px;
      outline: none;
    }
    input[type="text"]:focus {
      border-color: var(--vscode-focusBorder, #38bdf8);
    }
    .send-btn {
      background: var(--vscode-button-background, #0284c7);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      border-radius: 6px;
      padding: 0 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .send-btn:hover {
      background: var(--vscode-button-hoverBackground, #0369a1);
    }
    .loading-pulse {
      font-size: 11px;
      color: #38bdf8;
      font-family: monospace;
      display: none;
      padding: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-weight: 700; color: #fff; font-size: 12px; letter-spacing: 0.5px;">DevPilot Intelligence</span>
        <button id="authBtn" style="background: none; border: none; color: #64748b; font-size: 10px; cursor: pointer; text-decoration: underline;">
          Auth Key
        </button>
      </div>
      <div class="status-badge" id="statusBadge">
        <span class="status-dot" id="statusDot"></span>
        <span id="statusText">Connecting to backend...</span>
      </div>
    </div>

    <!-- AI Agent Mode Banner Button -->
    <div style="margin-bottom: 8px;">
      <button class="action-btn" id="btnAgent" style="width: 100%; justify-content: center; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; font-weight: 600;">
        <span>🤖 AI Agent Mode (Plan &amp; Implement)</span>
      </button>
    </div>

    <!-- Quick Action Buttons -->
    <div class="quick-actions">
      <button class="action-btn" id="btnExplain">
        <span>⚡ Explain</span>
      </button>
      <button class="action-btn" id="btnReview">
        <span>🔍 Review</span>
      </button>
      <button class="action-btn" id="btnRefactor">
        <span>🛠️ Refactor</span>
      </button>
      <button class="action-btn" id="btnTests">
        <span>🧪 Tests</span>
      </button>
    </div>

    <!-- Messages Container -->
    <div class="chat-messages" id="messagesContainer">
      <div class="msg assistant">
        <strong>DevPilot Active</strong><br/>
        Select code in the editor to run actions or ask questions about the repository below.
      </div>
    </div>

    <div class="loading-pulse" id="loadingIndicator">
      &bull; Querying Codebase RAG...
    </div>

    <!-- Chat Input Area -->
    <div class="input-box">
      <input type="text" id="chatInput" placeholder="Ask codebase question..." />
      <button class="send-btn" id="sendBtn">Ask</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const authBtn = document.getElementById('authBtn');

    // Send Message
    function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'sendMessage', text: text });
      chatInput.value = '';
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Command shortcuts
    document.getElementById('btnAgent').addEventListener('click', () => {
      vscode.postMessage({ type: 'executeCommand', command: 'devpilot.agentMode' });
    });
    document.getElementById('btnExplain').addEventListener('click', () => {
      vscode.postMessage({ type: 'executeCommand', command: 'devpilot.explainCode' });
    });
    document.getElementById('btnReview').addEventListener('click', () => {
      vscode.postMessage({ type: 'executeCommand', command: 'devpilot.reviewCode' });
    });
    document.getElementById('btnRefactor').addEventListener('click', () => {
      vscode.postMessage({ type: 'executeCommand', command: 'devpilot.refactorCode' });
    });
    document.getElementById('btnTests').addEventListener('click', () => {
      vscode.postMessage({ type: 'executeCommand', command: 'devpilot.generateTests' });
    });

    authBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'setToken' });
    });

    // Handle messages from extension host
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'addMessage': {
          const div = document.createElement('div');
          div.className = 'msg ' + msg.message.role;
          div.innerHTML = msg.message.content.replace(/\\n/g, '<br/>');

          if (msg.message.sourceReferences && msg.message.sourceReferences.length > 0) {
            const citDiv = document.createElement('div');
            citDiv.style.marginTop = '6px';
            msg.message.sourceReferences.forEach(ref => {
              const chip = document.createElement('span');
              chip.className = 'citation-chip';
              chip.innerText = ref.fileName + ' (L' + ref.lineRange + ')';
              citDiv.appendChild(chip);
            });
            div.appendChild(citDiv);
          }

          messagesContainer.appendChild(div);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          break;
        }

        case 'setLoading': {
          loadingIndicator.style.display = msg.loading ? 'block' : 'none';
          break;
        }

        case 'statusResult': {
          if (msg.connected) {
            statusDot.className = 'status-dot online';
            statusText.innerText = 'Connected: ' + msg.url;
          } else {
            statusDot.className = 'status-dot offline';
            statusText.innerText = 'Offline: Check port 5000';
          }
          break;
        }
      }
    });

    // Check status on load
    vscode.postMessage({ type: 'checkStatus' });
  </script>
</body>
</html>`;
  }
}
