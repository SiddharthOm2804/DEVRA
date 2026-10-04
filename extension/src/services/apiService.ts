import * as vscode from "vscode";
import * as http from "http";
import * as https from "https";

export interface CodeContext {
  fileName: string;
  filePath: string;
  language: string;
  code: string;
  workspaceName?: string;
  context?: string;
}

export interface ReviewResponse {
  success: boolean;
  message?: string;
  review?: {
    summary: string;
    severity: string;
    score: number;
    issues: Array<{
      type: string;
      title: string;
      description: string;
      severity: string;
      line?: number;
      rule?: string;
    }>;
    suggestions: Array<{
      title: string;
      description: string;
      codeSnippet: string;
      impact: string;
    }>;
  };
}

export interface ChatResponse {
  success: boolean;
  message?: {
    role: string;
    content: string;
    sourceReferences?: Array<{
      fileName: string;
      filePath: string;
      lineRange: string;
      snippet: string;
      relevanceScore: number;
    }>;
  };
  sourceReferences?: Array<{
    fileName: string;
    filePath: string;
    lineRange: string;
    snippet: string;
    relevanceScore: number;
  }>;
  codeSnippet?: string;
}

export interface AgentPlanStep {
  stepNumber: number;
  title: string;
  description: string;
  filesToTouch: string[];
  safetyCheck: string;
}

export interface AgentPlan {
  summary: string;
  steps: AgentPlanStep[];
  affectedFiles: string[];
  estimatedRisk: "low" | "medium" | "high";
  safeguards: string[];
}

export interface ProposedChange {
  filePath: string;
  action: "create" | "modify" | "delete";
  originalContent: string;
  proposedContent: string;
  diff: string;
  summary: string;
  validated: boolean;
}

export interface AgentSessionData {
  _id: string;
  repositoryId: string | { _id: string; name: string; language: string };
  userId: string;
  goalPrompt: string;
  status: "planning" | "plan_ready" | "plan_approved" | "changes_ready" | "applied" | "rejected";
  plan?: AgentPlan;
  proposedChanges: ProposedChange[];
  backupSnapshot?: Array<{ filePath: string; content: string; action: string }>;
  auditLog?: Array<{ action: string; timestamp: string; metadata?: any }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentSessionResponse {
  success: boolean;
  message?: string;
  session: AgentSessionData;
}

export class ApiService {
  private static instance: ApiService;
  private secretStorage: vscode.SecretStorage;

  private constructor(secretStorage: vscode.SecretStorage) {
    this.secretStorage = secretStorage;
  }

  public static initialize(secretStorage: vscode.SecretStorage): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService(secretStorage);
    }
    return ApiService.instance;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      throw new Error("ApiService has not been initialized with secretStorage.");
    }
    return ApiService.instance;
  }

  public getApiUrl(): string {
    const config = vscode.workspace.getConfiguration("devpilot");
    return config.get<string>("apiUrl") || "http://localhost:5000";
  }

  public async getToken(): Promise<string> {
    const token = await this.secretStorage.get("devpilot_token");
    return token || "";
  }

  public async setToken(token: string): Promise<void> {
    await this.secretStorage.store("devpilot_token", token);
  }

  public async clearToken(): Promise<void> {
    await this.secretStorage.delete("devpilot_token");
  }

  /**
   * Lightweight native HTTP/HTTPS request dispatcher
   */
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    body?: any
  ): Promise<T> {
    const baseUrl = this.getApiUrl().replace(/\/$/, "");
    const url = new URL(`${baseUrl}${endpoint}`);
    const token = await this.getToken();

    return new Promise((resolve, reject) => {
      const isHttps = url.protocol === "https:";
      const client = isHttps ? https : http;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json"
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const postData = body ? JSON.stringify(body) : undefined;
      if (postData) {
        headers["Content-Length"] = Buffer.byteLength(postData).toString();
      }

      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method,
          headers,
          timeout: 25000
        },
        (res) => {
          let responseData = "";

          res.on("data", (chunk) => {
            responseData += chunk;
          });

          res.on("end", () => {
            try {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                const parsed = JSON.parse(responseData || "{}");
                resolve(parsed as T);
              } else {
                let errorMessage = `Server returned HTTP ${res.statusCode}`;
                try {
                  const errorJson = JSON.parse(responseData);
                  errorMessage = errorJson.message || errorMessage;
                } catch {
                  // Keep default error message
                }
                reject(new Error(errorMessage));
              }
            } catch (err: any) {
              reject(new Error(`Failed to parse backend response: ${err.message}`));
            }
          });
        }
      );

      req.on("error", (err) => {
        reject(
          new Error(
            `DevPilot backend unreachable at ${baseUrl}. Ensure backend server is running on port 5000. (${err.message})`
          )
        );
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`DevPilot request timed out connecting to ${baseUrl}`));
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  /**
   * Check connection and health of DevPilot platform
   */
  public async checkHealth(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>("/api/health", "GET");
  }

  /**
   * Run AI Code Review on selected code snippet
   */
  public async reviewCode(ctx: CodeContext): Promise<ReviewResponse> {
    return this.request<ReviewResponse>("/api/reviews/generate", "POST", {
      fileName: ctx.fileName,
      filePath: ctx.filePath,
      language: ctx.language,
      code: ctx.code,
      context: ctx.context || `VS Code Review: ${ctx.fileName}`
    });
  }

  /**
   * Explain selected code using codebase intelligence
   */
  public async explainCode(ctx: CodeContext): Promise<ChatResponse> {
    const prompt = `Please explain the following ${ctx.language} code selected in file \`${ctx.fileName}\`:\n\`\`\`${ctx.language}\n${ctx.code}\n\`\`\`\nExplain its purpose, control flow, key dependencies, and potential edge cases.`;

    // Attempt to find repository ID if available, otherwise call chat endpoint
    const repos = await this.getRepositories().catch(() => ({ repositories: [] }));
    const repoId = repos.repositories?.[0]?._id;

    return this.request<ChatResponse>("/api/chat/message", "POST", {
      repositoryId: repoId || "6abff28b6c2cad13aa301fa6",
      message: prompt
    });
  }

  /**
   * Refactor selected code with optimization recommendations
   */
  public async refactorCode(ctx: CodeContext, instruction = "Refactor for optimal performance and clean architecture"): Promise<ReviewResponse> {
    return this.request<ReviewResponse>("/api/reviews/generate", "POST", {
      fileName: ctx.fileName,
      filePath: ctx.filePath,
      language: ctx.language,
      code: ctx.code,
      context: `Refactoring request: ${instruction}`
    });
  }

  /**
   * Generate comprehensive unit tests for selected code
   */
  public async generateTests(ctx: CodeContext): Promise<ChatResponse> {
    const prompt = `Generate comprehensive, production-grade unit tests for the following ${ctx.language} code from \`${ctx.fileName}\`:\n\`\`\`${ctx.language}\n${ctx.code}\n\`\`\`\nInclude happy path tests, edge cases, error boundary assertions, and mocking where appropriate.`;

    const repos = await this.getRepositories().catch(() => ({ repositories: [] }));
    const repoId = repos.repositories?.[0]?._id;

    return this.request<ChatResponse>("/api/chat/message", "POST", {
      repositoryId: repoId || "6abff28b6c2cad13aa301fa6",
      message: prompt
    });
  }

  /**
   * Send question to codebase RAG chat
   */
  public async sendChatMessage(message: string, repositoryId?: string): Promise<ChatResponse> {
    let targetRepoId = repositoryId;
    if (!targetRepoId) {
      const repos = await this.getRepositories().catch(() => ({ repositories: [] }));
      targetRepoId = repos.repositories?.[0]?._id || "6abff28b6c2cad13aa301fa6";
    }

    return this.request<ChatResponse>("/api/chat/message", "POST", {
      repositoryId: targetRepoId,
      message
    });
  }

  /**
   * Fetch connected repositories
   */
  public async getRepositories(): Promise<{ repositories: Array<{ _id: string; name: string; language: string }> }> {
    return this.request<{ repositories: Array<{ _id: string; name: string; language: string }> }>("/api/repositories", "GET");
  }

  /**
   * Helper to ensure auth token is set; if not present, authenticates with standard dev credentials or prompts
   */
  public async ensureAuthenticated(): Promise<string> {
    let token = await this.getToken();
    if (token) return token;

    try {
      // Auto-authenticate with workspace developer credentials if available
      const loginRes = await this.request<{ success: boolean; token: string }>("/api/auth/login", "POST", {
        email: "architect@devpilot.ai",
        password: "SuperSecretPassword123!"
      });
      if (loginRes.token) {
        await this.setToken(loginRes.token);
        return loginRes.token;
      }
    } catch {
      // Silent catch; proceed to prompt user if required
    }
    return token;
  }

  /**
   * AI AGENT MODE: Create an implementation plan from user goal
   */
  public async createAgentPlan(goalPrompt: string, repositoryId?: string): Promise<AgentSessionResponse> {
    await this.ensureAuthenticated();
    let targetRepoId = repositoryId;
    if (!targetRepoId) {
      const repos = await this.getRepositories().catch(() => ({ repositories: [] }));
      targetRepoId = repos.repositories?.[0]?._id || "6abff28b6c2cad13aa301fa6";
    }

    return this.request<AgentSessionResponse>("/api/agent/plan", "POST", {
      repositoryId: targetRepoId,
      goalPrompt
    });
  }

  /**
   * AI AGENT MODE: Approve plan and generate proposed code changes and diff preview
   */
  public async approveAgentPlan(sessionId: string): Promise<AgentSessionResponse> {
    await this.ensureAuthenticated();
    return this.request<AgentSessionResponse>(`/api/agent/${sessionId}/approve-plan`, "POST");
  }

  /**
   * AI AGENT MODE: Apply changes safely with reversible snapshot
   */
  public async applyAgentChanges(sessionId: string): Promise<AgentSessionResponse> {
    await this.ensureAuthenticated();
    return this.request<AgentSessionResponse>(`/api/agent/${sessionId}/apply`, "POST");
  }

  /**
   * AI AGENT MODE: Reject changes and keep project files 100% untouched
   */
  public async rejectAgentChanges(sessionId: string, reason?: string): Promise<AgentSessionResponse> {
    await this.ensureAuthenticated();
    return this.request<AgentSessionResponse>(`/api/agent/${sessionId}/reject`, "POST", { reason });
  }

  /**
   * AI AGENT MODE: Get agent session details
   */
  public async getAgentSession(sessionId: string): Promise<AgentSessionResponse> {
    await this.ensureAuthenticated();
    return this.request<AgentSessionResponse>(`/api/agent/${sessionId}`, "GET");
  }
}

