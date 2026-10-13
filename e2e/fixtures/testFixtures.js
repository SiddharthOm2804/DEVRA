/**
 * Deterministic Test Fixtures and Helpers for DEVRA E2E Suite
 */

import jwt from "jsonwebtoken";

const TEST_JWT_SECRET = process.env.JWT_SECRET || "test_e2e_jwt_secret_devra_2026";

function createTestToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    TEST_JWT_SECRET,
    { expiresIn: "7d" }
  );
}

const rawArchitect = {
  id: "user-architect-101",
  name: "Devra Architect",
  email: "architect@devra.ai",
  role: "architect",
  organization: "Devra Systems"
};

const rawDeveloper = {
  id: "user-developer-102",
  name: "Devra Developer",
  email: "developer@devra.ai",
  role: "developer",
  organization: "Devra Systems"
};

const rawGuest = {
  id: "user-guest-103",
  name: "Devra Guest",
  email: "guest@devra.ai",
  role: "guest",
  organization: "Devra Systems"
};

const rawAdmin = {
  id: "user-admin-104",
  name: "Devra Admin",
  email: "admin@devra.ai",
  role: "admin",
  organization: "Devra Systems"
};

export const TEST_USERS = {
  ARCHITECT: { ...rawArchitect, token: createTestToken(rawArchitect) },
  DEVELOPER: { ...rawDeveloper, token: createTestToken(rawDeveloper) },
  GUEST: { ...rawGuest, token: createTestToken(rawGuest) },
  ADMIN: { ...rawAdmin, token: createTestToken(rawAdmin) }
};

export const MOCK_REPOSITORIES = [
  {
    _id: "repo-core-01",
    id: "repo-core-01",
    name: "devra-core",
    fullName: "devra-systems/devra-core",
    description: "Core AI orchestration engine, Tree-sitter WASM parser, and Persistent Redis Vector Store",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 1240,
    forks: 180,
    openIssues: 4,
    visibility: "public",
    defaultBranch: "main",
    activeBranch: "main",
    qualityGrade: "A+",
    health: 96,
    securityStatus: "Secure",
    filesCount: 142,
    fileTree: [
      { path: "src/server.ts", name: "server.ts", extension: "ts", lines: 280, isEntryPoint: true },
      { path: "src/controllers/authController.ts", name: "authController.ts", extension: "ts", lines: 240 },
      { path: "src/services/treeSitterParser.ts", name: "treeSitterParser.ts", extension: "ts", lines: 320 },
      { path: "src/services/vectorStore.ts", name: "vectorStore.ts", extension: "ts", lines: 410 },
      { path: "src/models/Repository.ts", name: "Repository.ts", extension: "ts", lines: 190 },
      { path: "src/utils/logger.ts", name: "logger.ts", extension: "ts", lines: 95 }
    ]
  },
  {
    _id: "repo-hypercache-02",
    id: "repo-hypercache-02",
    name: "hyper-cache-engine",
    fullName: "devra-systems/hyper-cache-engine",
    description: "Distributed LRU memory cache with Raft consensus and sub-millisecond p99 latencies",
    language: "Rust",
    languageColor: "#dea584",
    stars: 840,
    forks: 64,
    openIssues: 2,
    visibility: "private",
    defaultBranch: "main",
    activeBranch: "main",
    qualityGrade: "A",
    health: 94,
    securityStatus: "Secure",
    filesCount: 68
  }
];

export const MOCK_REVIEWS = [
  {
    _id: "rev-101",
    id: "rev-101",
    title: "Automated Review for PR #42",
    fileName: "PR #42 (a1b2c3d)",
    filePath: "pull/42",
    summary: "DEVRA automated analysis detected 1 finding across changed files. Zero critical security vulnerabilities.",
    severity: "medium",
    score: 93,
    status: "completed",
    source: "webhook",
    prNumber: 42,
    commitSha: "a1b2c3d4e5f67890",
    createdAt: new Date().toISOString(),
    issues: [
      {
        type: "maintainability",
        title: "Function complexity exceeds threshold",
        description: "Consider extracting helper function for JWT claims verification.",
        severity: "medium",
        filePath: "server/src/auth/tokenValidator.js",
        line: 24,
        rule: "complexity-threshold"
      }
    ]
  }
];

export const MOCK_AGENT_SESSION = {
  _id: "session-agent-999",
  repositoryId: "repo-core-01",
  goalPrompt: "Implement rate limiting middleware",
  status: "plan_ready",
  plan: {
    summary: "Implement sliding window token bucket rate limiter middleware for Express.",
    estimatedRisk: "low",
    affectedFiles: ["server/src/middleware/rateLimiter.js"],
    steps: [
      {
        stepNumber: 1,
        title: "Create token bucket rate limiter in middleware",
        description: "Define rate limit window and threshold counter using Redis or memory.",
        action: "create_file"
      },
      {
        stepNumber: 2,
        title: "Register middleware in app.js",
        description: "Attach rate limiter to API routes.",
        action: "edit_file"
      }
    ]
  },
  proposedChanges: [
    {
      filePath: "server/src/middleware/rateLimiter.js",
      action: "create",
      summary: "Add rate limiting middleware",
      diff: "@@ -0,0 +1,15 @@\n+export const rateLimiter = (req, res, next) => next();"
    }
  ]
};

/**
 * Injects deterministic API intercepts for consistent E2E execution
 */
export async function setupDeterministicMockApi(page, user = TEST_USERS.ARCHITECT) {
  // Current user endpoint
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization
        }
      })
    });
  });

  // Login endpoint
  await page.route("**/api/auth/login", async (route) => {
    const postData = route.request().postDataJSON() || {};
    if (postData.password === "InvalidPassword999!") {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Invalid email or password."
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        token: user.token,
        user: {
          id: user.id,
          name: user.name,
          email: postData.email || user.email,
          role: user.role,
          organization: user.organization
        }
      })
    });
  });

  // Repositories list and single repository endpoints
  await page.route("**/api/repositories**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/github/status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          isGithubConnected: true,
          githubUsername: "devra-engineer",
          githubAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64",
          reposCount: 8,
          oauthConfigured: true
        })
      });
      return;
    }

    if (url.includes("/github/repos")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          repositories: MOCK_REPOSITORIES
        })
      });
      return;
    }

    // Detail endpoint (e.g. /api/repositories/repo-core-01)
    if (/\/api\/repositories\/[a-zA-Z0-9_-]+(\?.*)?$/.test(url)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          repository: MOCK_REPOSITORIES[0],
          analysis: {
            files: MOCK_REPOSITORIES[0].fileTree,
            modules: [
              { name: "Frontend", path: "client/", fileCount: 10, primaryLanguage: "TypeScript", description: "React 19 dashboard and 3D visual cockpit" },
              { name: "Backend", path: "src/", fileCount: 8, primaryLanguage: "TypeScript", description: "Express API routes and controllers" },
              { name: "Services", path: "src/services/", fileCount: 4, primaryLanguage: "TypeScript", description: "Core business logic" },
              { name: "Database", path: "src/models/", fileCount: 3, primaryLanguage: "TypeScript", description: "MongoDB models" }
            ],
            dependencies: [
              { name: "react", version: "19.0.0" },
              { name: "three", version: "0.173.0" }
            ]
          }
        })
      });
      return;
    }

    // List endpoint: GET /api/repositories or with query params
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          repositories: MOCK_REPOSITORIES
        })
      });
      return;
    }

    await route.continue();
  });

  // Analysis endpoint
  await page.route("**/api/analysis/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        analysis: {
          files: MOCK_REPOSITORIES[0].fileTree,
          modules: [
            { name: "Frontend", path: "client/", fileCount: 10, primaryLanguage: "TypeScript", description: "React 19 dashboard and 3D visual cockpit" },
            { name: "Backend", path: "src/", fileCount: 8, primaryLanguage: "TypeScript", description: "Express API routes and controllers" },
            { name: "Services", path: "src/services/", fileCount: 4, primaryLanguage: "TypeScript", description: "Core business logic" },
            { name: "Database", path: "src/models/", fileCount: 3, primaryLanguage: "TypeScript", description: "MongoDB models" }
          ],
          dependencies: [
            { name: "react", version: "19.0.0" },
            { name: "three", version: "0.173.0" }
          ]
        }
      })
    });
  });

  // Reviews endpoint
  await page.route("**/api/reviews*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        reviews: MOCK_REVIEWS
      })
    });
  });

  // Agent API endpoints (list, create plan, get session, approve)
  await page.route("**/api/agent**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/api/agent/plan") && method === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "AI Agent plan synthesized successfully.",
          session: MOCK_AGENT_SESSION
        })
      });
      return;
    }

    if (url.includes("/approve-plan") || url.includes("/apply")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Action applied successfully",
          session: {
            ...MOCK_AGENT_SESSION,
            status: "applied"
          }
        })
      });
      return;
    }

    // List or get session
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        sessions: [MOCK_AGENT_SESSION],
        session: MOCK_AGENT_SESSION
      })
    });
  });

  // Logout endpoint
  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Logged out successfully"
      })
    });
  });
}

/**
 * Sets authenticated session state in localStorage and navigates to target path
 */
export async function authenticateSession(page, user = TEST_USERS.ARCHITECT, targetPath = "/dashboard") {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, userObj }) => {
    localStorage.setItem("devra_token", token);
    localStorage.setItem("devra_user", JSON.stringify(userObj));
  }, { token: user.token, userObj: user });

  await page.goto(targetPath, { waitUntil: "domcontentloaded" });
  // Wait for initial Suspense loader to finish
  const loader = page.getByText("Loading Devra...");
  if (await loader.isVisible().catch(() => false)) {
    await loader.waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
  }
}
