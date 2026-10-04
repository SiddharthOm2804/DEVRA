# Devra API Documentation

## Base URL
- Development: `http://localhost:5000`
- Production: `https://api.devra.io` (Configured via `CLIENT_URL` and `PORT`)

---

## Foundation & System Endpoints

### 1. Root Status
- **Method**: `GET`
- **Route**: `/`
- **Description**: Returns basic service metadata and links.

#### Response: `200 OK`
```json
{
  "name": "Devra API Server",
  "status": "online",
  "healthCheck": "/api/health",
  "version": "0.1.0"
}
```

---

### 2. Health Check
- **Method**: `GET`
- **Route**: `/api/health`
- **Description**: Real-time heartbeat, uptime, and database connection status.

#### Response: `200 OK`
```json
{
  "status": "ok",
  "message": "Devra Server is running smoothly",
  "timestamp": "2026-10-02T17:30:00.000Z",
  "uptime": "142.4s",
  "environment": "development",
  "service": "devra-server",
  "database": {
    "status": "connected",
    "readyState": 1
  }
}
```

---

## Authentication Endpoints (Phase 2 - Implemented)

### 3. Register Account
- **Method**: `POST`
- **Route**: `/api/auth/register`
- **Body**: `{ "name": "...", "email": "...", "password": "...", "organization": "..." }`
- **Response**: `201 Created` with JWT token and sanitized user profile.

### 4. User Login
- **Method**: `POST`
- **Route**: `/api/auth/login`
- **Body**: `{ "email": "...", "password": "..." }`
- **Response**: `200 OK` with JWT token and user profile.

### 5. Current Profile (`/me`)
- **Method**: `GET`
- **Route**: `/api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` with authenticated user profile.

### 6. Logout
- **Method**: `POST`
- **Route**: `/api/auth/logout`
- **Response**: `200 OK` confirmation.

---

## Repository & Data Layer Endpoints (Phase 2 - Implemented)

### 7. List Repositories
- **Method**: `GET`
- **Route**: `/api/repositories`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `search` (string), `language` (string), `sort` (string)
- **Description**: Retrieves all connected repositories for the authenticated user. Automatically seeds curated sample repositories on initial onboarding.

### 8. Connect / Create Repository
- **Method**: `POST`
- **Route**: `/api/repositories`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "name": "quantum-mesh",
  "description": "Distributed agent runtime",
  "language": "Rust",
  "activeBranch": "main",
  "gitUrl": "https://github.com/org/repo.git"
}
```
- **Response**: `201 Created` with populated repository document.

### 9. Get Repository Details
- **Method**: `GET`
- **Route**: `/api/repositories/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` with repository document, metrics, and AST fileTree.

### 10. Update Repository
- **Method**: `PUT`
- **Route**: `/api/repositories/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Updated repository fields.
- **Response**: `200 OK`.

### 11. Delete Repository
- **Method**: `DELETE`
- **Route**: `/api/repositories/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` deletion confirmation.

### 12. Sync & Rescan Repository
- **Method**: `POST`
- **Route**: `/api/repositories/:id/sync`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Triggers metrics recalculation, commit sync, and scan update.

---

## GitHub Integration Endpoints (Phase 2 - Implemented)

### 13. GitHub Connection Status
- **Method**: `GET`
- **Route**: `/api/repositories/github/status`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Returns `{ isGithubConnected, githubUsername, githubAvatar }` without exposing access tokens.

### 14. List Available GitHub Repositories
- **Method**: `GET`
- **Route**: `/api/repositories/github/repos`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Fetches the authenticated user's remote repositories from GitHub, annotating whether they are already imported.

### 15. Import / Connect GitHub Repository
- **Method**: `POST`
- **Route**: `/api/repositories/github/connect-repo`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Complete GitHub repository metadata (ID, name, owner, URL, defaultBranch, language, stars, forks, isPrivate, lastUpdated).
- **Description**: Stores connected repository metadata in MongoDB.

### 16. Connect GitHub Account
- **Method**: `POST`
- **Route**: `/api/repositories/github/connect-account`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "token": "...", "username": "..." }`
- **Description**: Securely associates a GitHub account or Personal Access Token with the user.

### 17. Disconnect GitHub Account
- **Method**: `POST`
- **Route**: `/api/repositories/github/disconnect`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Removes GitHub association and securely deletes access tokens on backend.

---

## Codebase Analysis Engine Endpoints (Implemented)

### 18. Trigger / Run Codebase Analysis
- **Method**: `POST`
- **Route**: `/api/analysis/:repositoryId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Executes the codebase analysis pipeline:
  1. Fetches repository file tree (via GitHub Trees API or fallback synthesized AST).
  2. Filters out irrelevant files (`node_modules`, `.git`, `dist`, `build`, `coverage`, lockfiles, binary files, minified bundles).
  3. Detects programming languages and percentage distribution.
  4. Analyzes directory structure and clusters modular domains.
  5. Identifies architectural entry points (`server`, `client`, `cli`).
  6. Extracts dependencies from manifests (`package.json`, `Cargo.toml`, `go.mod`, `requirements.txt`).
  7. Maps architectural layer relationships (`client -> server -> controllers -> services -> models`).
  8. Computes total files and estimated lines of code (LOC).
  9. Persists and returns structured analysis document in MongoDB.

#### Response: `200 OK`
```json
{
  "status": "success",
  "message": "Codebase analysis completed successfully",
  "data": {
    "analysis": {
      "repositoryId": "68def0...",
      "summary": {
        "totalFiles": 37,
        "totalLines": 4026,
        "totalDirectories": 14,
        "primaryLanguage": "TypeScript"
      },
      "languages": [
        { "name": "TypeScript", "count": 28, "percentage": 86, "color": "#3178c6" },
        { "name": "Markdown", "count": 2, "percentage": 8.1, "color": "#083fa1" },
        { "name": "JavaScript", "count": 5, "percentage": 4.4, "color": "#f1e05a" },
        { "name": "JSON", "count": 2, "percentage": 1.5, "color": "#292929" }
      ],
      "entryPoints": [
        { "path": "src/index.ts", "type": "server", "reason": "Standard server entry point" },
        { "path": "client/src/main.tsx", "type": "client", "reason": "Standard client entry point" }
      ],
      "modules": [
        { "name": "auth", "path": "src/auth", "fileCount": 4, "primaryLanguage": "TypeScript" },
        { "name": "controllers", "path": "src/controllers", "fileCount": 5, "primaryLanguage": "TypeScript" },
        { "name": "services", "path": "src/services", "fileCount": 6, "primaryLanguage": "TypeScript" }
      ],
      "dependencies": [
        { "name": "express", "version": "^4.19.0", "type": "production", "ecosystem": "npm" },
        { "name": "mongoose", "version": "^8.0.0", "type": "production", "ecosystem": "npm" },
        { "name": "vitest", "version": "^1.4.0", "type": "development", "ecosystem": "npm" }
      ],
      "relationships": [
        { "from": "client", "to": "server", "type": "consumes_api" },
        { "from": "server", "to": "controllers", "type": "routes_to" },
        { "from": "controllers", "to": "services", "type": "delegates_to" },
        { "from": "services", "to": "models", "type": "queries_database" }
      ],
      "generatedAt": "2026-10-02T18:25:00.000Z"
    }
  }
}
```

### 19. Get Existing Codebase Analysis
- **Method**: `GET`
- **Route**: `/api/analysis/:repositoryId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Retrieves the latest persisted codebase analysis for the given repository. If no analysis exists yet, automatically runs an initial analysis and persists it.

#### Response: `200 OK`
```json
{
  "status": "success",
  "data": {
    "analysis": { ... }
  }
}
```

---

## AI Code Review Engine Endpoints (Implemented)

### 20. Generate AI Code Review
- **Method**: `POST`
- **Route**: `/api/reviews/generate`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "repositoryId": "68def0...",
  "fileName": "authController.js",
  "language": "JavaScript",
  "code": "async function handleAuth(req, res) { ... }",
  "context": "PR #42: Security audit before production deploy"
}
```
- **Description**: Submits source code or file diff to the AI review pipeline:
  1. Inspects code for bugs, security vulnerabilities (eval, secrets, XSS), performance bottlenecks, and code smells.
  2. Strictly validates and normalizes output schema: `{ summary, severity, score, issues, suggestions, metrics }`.
  3. Persists structured review document in MongoDB (`Review` collection).
  4. Supports Gemini 1.5 Pro, OpenAI GPT-4o, and an integrated heuristic AST rule engine.

#### Response: `201 Created`
```json
{
  "success": true,
  "message": "AI code review generated and validated successfully",
  "review": {
    "_id": "68f0a1...",
    "repositoryId": "68def0...",
    "fileName": "authController.js",
    "language": "JavaScript",
    "summary": "DevPilot analysis identified 4 potential area(s) of improvement in authController.js, including 3 high-priority finding(s).",
    "severity": "critical",
    "score": 29,
    "issues": [
      {
        "id": "issue-1-...",
        "type": "security",
        "title": "Arbitrary Code Execution via eval()",
        "description": "Direct invocation of eval() allows arbitrary code execution and injection.",
        "severity": "critical",
        "line": 5,
        "rule": "sec-no-eval"
      }
    ],
    "suggestions": [
      {
        "title": "Replace eval with strict parser",
        "description": "Refactor dynamic evaluation to use JSON.parse() or a secure AST visitor pattern.",
        "codeSnippet": "const parsedData = JSON.parse(userInput);",
        "impact": "Critical"
      }
    ],
    "metrics": {
      "bugsCount": 1,
      "securityCount": 2,
      "performanceCount": 0,
      "smellsCount": 1,
      "maintainabilityCount": 0
    },
    "aiProvider": "gemini",
    "aiModel": "gemini-1.5-pro",
    "status": "completed",
    "createdAt": "2026-10-02T18:39:00.000Z"
  }
}
```

### 21. List Code Reviews
- **Method**: `GET`
- **Route**: `/api/reviews`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `repositoryId` (optional), `severity` (optional), `limit` (default: 20), `page` (default: 1)
- **Description**: Returns paginated list of reviews for the authenticated user.

### 22. Get Single Code Review
- **Method**: `GET`
- **Route**: `/api/reviews/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Retrieves single review document by ID.

### 23. Delete Code Review
- **Method**: `DELETE`
- **Route**: `/api/reviews/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Permanently removes a review from the database.

---

## AI Codebase RAG Chat Endpoints (Implemented)

### 24. Send Message to Codebase RAG Chat
- **Method**: `POST`
- **Route**: `/api/chat/message`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "repositoryId": "68def0...",
  "message": "Where is authentication implemented?",
  "conversationId": "68f12a..."
}
```
- **Description**: Executes the codebase RAG pipeline:
  1. Retrieves top-K semantically relevant code chunks via vector cosine similarity (never sends full repository).
  2. Synthesizes context with source file paths and line ranges.
  3. Prompts LLM (Gemini 1.5 Pro, OpenAI GPT-4o, or local AST synthesis).
  4. Returns answer with verified source citations and persists conversation history in MongoDB (`Chat` collection).

#### Response: `200 OK`
```json
{
  "success": true,
  "conversationId": "68f12a...",
  "message": {
    "role": "assistant",
    "content": "Authentication is implemented in `[server/src/routes/authRoutes.js:10-25]`...",
    "sourceReferences": [
      {
        "fileName": "authRoutes.js",
        "filePath": "server/src/routes/authRoutes.js",
        "lineRange": "1-42",
        "snippet": "router.post('/login', authController.login); ...",
        "relevanceScore": 45
      }
    ],
    "timestamp": "2026-10-02T18:45:00.000Z"
  },
  "sourceReferences": [ ... ]
}
```

### 25. Get Codebase Chat History
- **Method**: `GET`
- **Route**: `/api/chat/history/:repositoryId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Retrieves persistent conversation messages and source citations for the user and repository.

### 26. Clear Codebase Chat History
- **Method**: `DELETE`
- **Route**: `/api/chat/history/:repositoryId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Clears conversation messages and resets the active thread.

---

## AI Agent Mode Endpoints (Phase 4 - Implemented)

### 27. Create Implementation Plan
- **Method**: `POST`
- **Route**: `/api/agent/plan`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "repositoryId": "6abff28b6c2cad13aa301fa6",
  "goalPrompt": "Add forgot password functionality"
}
```
- **Description**: Initializes an Agent session, analyzes the repository structure, discovers relevant source files, evaluates risk, and synthesizes a step-by-step implementation plan.
- **Response**: `201 Created` with structured `session` in status `plan_ready`.

### 28. Approve Implementation Plan & Generate Diffs
- **Method**: `POST`
- **Route**: `/api/agent/:id/approve-plan`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Marks the plan as user-approved, synthesizes exact code modifications, validates code against security & AST safeguards (zero exposed secrets, no destructive commands), and computes unified diffs.
- **Response**: `200 OK` with `session` in status `changes_ready` and `proposedChanges` array.

### 29. Apply Proposed Changes (Safe & Reversible)
- **Method**: `POST`
- **Route**: `/api/agent/:id/apply`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Takes a complete reversible snapshot of the original files, safely applies modifications to the project, updates database state, and records audit logs.
- **Response**: `200 OK` with `session` in status `applied`.

### 30. Reject Proposed Changes
- **Method**: `POST`
- **Route**: `/api/agent/:id/reject`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "reason": "User rejected diff preview" }`
- **Description**: Discards proposed changes without modifying any files. The repository remains 100% untouched.
- **Response**: `200 OK` with `session` in status `rejected`.

### 31. Get Agent Session Details
- **Method**: `GET`
- **Route**: `/api/agent/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Returns agent plan, proposed changes, backup snapshot metadata, and audit log.

### 32. List User Agent Sessions
- **Method**: `GET`
- **Route**: `/api/agent`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `repositoryId` (optional), `limit` (default: 10)
- **Description**: Lists recent agent sessions for history tracking.

---

## Complete API Surface (Production Ready)

All Phase 1, Phase 2, Phase 3, and Phase 4 core engines (Codebase Analysis, 3D Spatial Visualizer, AI Code Review, Codebase Chat RAG, VS Code Extension, and Autonomous AI Agent Mode) are fully implemented, verified with MongoDB persistence, JWT authentication, and interactive React 19 UI cockpits.



