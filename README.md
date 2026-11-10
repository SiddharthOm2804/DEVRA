# DEVRA — Spatial AI Engineering & Code Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Backend Tests](https://img.shields.io/badge/backend%20tests-120%20passed-success.svg)](server/test.js)
[![Playwright E2E](https://img.shields.io/badge/playwright%20e2e-26%20passed-success.svg)](e2e/)
[![Design System](https://img.shields.io/badge/design-Abyssal%20Jade-047857.svg)](client/src/index.css)

> **DEVRA** is an enterprise developer intelligence platform that integrates Tree-sitter WASM AST syntax extraction, vector-grounded semantic code analysis, real-time 3D Three.js codebase architecture visualization with live source code inspection, and a VS Code extension with transactional agent safeguards and rollback capabilities.

---

## Key Capabilities

- **3D Spatial Codebase Explorer:** High-performance WebGL force-directed layout rendering codebases across multi-level of detail (LOD 0 Overview, LOD 1 Modules, LOD 2 Classes/Symbols, LOD 3 Deep AST) with instant AST search, node halos, and telemetry cockpits.
- **Real-Time Source Code Viewer:** Direct integration between 3D nodes and real repository source code with dynamic syntax highlighting, accurate CRLF/LF line counting, in-file search, jump-to-line, and AST symbol navigation.
- **Tree-sitter WASM AST Ingestion:** Syntax-aware code chunking for JavaScript, TypeScript, Python, Go, Rust, and C/C++ that extracts functions, classes, interfaces, and module imports into deterministic chunk hashes.
- **Vector-Grounded Retrieval (RAG):** RediSearch (`devra:idx:codebase`) vector search with HNSW and COSINE distance metrics, backed by persistent in-memory fallbacks when Redis is offline.
- **Atomic Single-Use Authentication:** Redis `GETDEL` (Redis 6.2+) and atomic Lua script fallbacks eliminate replay attacks across multi-instance load-balanced deployments.
- **Multi-User RBAC & IDOR Protection:** Granular permission map across Admin, Architect, Developer, and Guest roles with repository ownership verification on all resource routes.
- **VS Code Extension with Safety Snapshots:** AI agent mode proposing multi-file patches with native side-by-side diff previews, cross-platform path traversal protection, and in-memory pre-apply snapshots for transactional rollback.
- **Production Observability:** Built-in Prometheus metrics export (`/metrics`) and OpenTelemetry tracing.

---

## Technology Stack

- **Client:** React 19, Vite, Three.js, React Three Fiber, React Three Drei, Tailwind CSS, Lucide Icons
- **Backend:** Node.js (ESM), Express 4, Mongoose, ioredis, Web Tree-sitter WASM, Prom-Client, OpenTelemetry
- **Extension:** TypeScript, VS Code Extensibility API, Custom Webview Diff Providers
- **Databases & Infrastructure:** MongoDB Atlas / 7.0, Redis Cloud / Redis Stack (RediSearch & Pub/Sub), Docker Compose

---

## Monorepo Structure

```
├── client/           # React 19 SPA (Vite, Three.js, Abyssal Jade theme)
├── server/           # Express API server, Tree-sitter WASM, Redis vector store
├── extension/        # VS Code TypeScript extension (Agent mode, Status bar)
├── shared/           # Cross-package models, contracts, and shared constants
├── e2e/              # Playwright browser end-to-end test suite
├── docker/           # Dockerfiles, Nginx configs, and compose templates
├── docs/             # Technical architecture, security, and pre-production audit
├── render.yaml       # Render backend deployment blueprint
└── docker-compose.yml# Production container orchestration
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js v18 or v20 LTS
- npm v9+
- Docker Desktop (for MongoDB & Redis Stack) or MongoDB Atlas & Redis Cloud instances

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/SiddharthOm2804/DEVRA.git
cd Devra

# Install dependencies across all workspaces
npm install

# Configure environment variables
cp .env.example .env
cp server/.env.example server/.env

# Spin up MongoDB and Redis Stack containers (optional if using cloud)
npm run dev:infra

# Run the backend and client concurrently
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5001/api](http://localhost:5001/api)
- **Health Check:** [http://localhost:5001/api/health](http://localhost:5001/api/health)
- **Prometheus Metrics:** [http://localhost:5001/metrics](http://localhost:5001/metrics)

---

## Verification & Testing

DEVRA includes comprehensive automated test suites across all packages:

```bash
# Run backend integration tests (120 passing tests)
npm test

# Run Playwright end-to-end suite (26 passing tests)
npm run test:e2e

# Run client production build
npm --prefix client run build

# Compile VS Code extension
npm --prefix extension run compile

# Run complete monorepo build
npm run build
```

---

## Environment Variables Reference

| Variable | Target | Required in Prod | Purpose | Example Format |
|---|---|---|---|---|
| `NODE_ENV` | Server | **Yes** | Execution mode (`production` activates security checks) | `production` |
| `PORT` | Server | **Yes** | HTTP listener port (assigned dynamically on Render) | `5001` or `10000` |
| `CLIENT_URL` | Server | **Yes** | Approved frontend origin for CORS and OAuth redirects | `https://devra-app.vercel.app` |
| `MONGODB_URI` | Server | **Yes** | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/devra?retryWrites=true&w=majority` |
| `JWT_SECRET` | Server | **Yes** | High-entropy secret for signing user JWTs (min 32 chars) | `64-hex-character-random-string` |
| `JWT_EXPIRES_IN` | Server | No | JWT validity duration (defaults to `7d`) | `7d` |
| `GITHUB_CLIENT_ID` | Server | Optional | GitHub OAuth App Client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | Server | Optional | GitHub OAuth App Client Secret | `40-hex-character-secret` |
| `GITHUB_CALLBACK_URL` | Server | Optional | OAuth redirection target URL | `https://devra-api.onrender.com/api/auth/github/callback` |
| `GITHUB_WEBHOOK_SECRET` | Server | **Yes** | Secret for verifying GitHub webhook HMAC signatures (min 16 chars) | `32-character-random-string` |
| `AI_PROVIDER` | Server | No | Active AI backend (`gemini` or `openai`) | `gemini` |
| `AI_API_KEY` | Server | Optional | API key for Gemini / OpenAI | `AIzaSy...` |
| `AI_MODEL` | Server | No | Model identifier | `gemini-1.5-pro` |
| `REDIS_URL` | Server | Optional | Redis connection URL | `rediss://default:pass@redis-host:6379` |
| `REDIS_HOST` | Server | Optional | Redis host if not using `REDIS_URL` | `localhost` or `redis.cloud.redislabs.com` |
| `REDIS_PORT` | Server | No | Redis port | `6379` |
| `REDIS_PASSWORD` | Server | Optional | Redis password | `password` |
| `REDIS_TLS` | Server | Optional | Enable TLS for Redis Cloud (`true`/`false`) | `true` |
| `VECTOR_STORE` | Server | No | Active vector store engine (`redis` or `memory`) | `redis` |
| `VITE_API_URL` | Client | **Yes** | Base URL of backend API for production client | `https://devra-api.onrender.com` |

---

## Production Deployment (Vercel & Render)

### Backend Deployment (Render)
1. In the Render Dashboard, create a new **Web Service** connected to this repository.
2. Select **Node** environment with **Root Directory** as `.`.
3. Set **Build Command** to `npm install` and **Start Command** to `node server/src/server.js`.
4. Configure required environment variables (`NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `REDIS_URL`).
5. Render uses the health check endpoint `/api/health`.

### Frontend Deployment (Vercel)
1. In the Vercel Dashboard, import this repository.
2. Set **Root Directory** to `client`.
3. Framework Preset: **Vite**.
4. Set **Build Command** to `npm run build` and **Output Directory** to `dist`.
5. Set `VITE_API_URL` to your live Render backend URL (e.g. `https://devra-api.onrender.com`).
6. `client/vercel.json` provides automatic SPA routing rewrites.

### GitHub OAuth & Webhooks
1. In GitHub Developer Settings > OAuth Apps:
   - **Homepage URL:** Your Vercel frontend URL (`https://devra-app.vercel.app`).
   - **Authorization Callback URL:** `https://devra-api.onrender.com/api/auth/github/callback`.
2. Configure `GITHUB_CALLBACK_URL` on Render to match this URL.

---

## Security Architecture

- **Path Traversal Protection:** Absolute path escapes, relative `..` traversals, and secret file accesses (`.env*`, `id_rsa`, `.git/`) are blocked with HTTP 400/403.
- **Timing-Safe Signatures:** Webhook HMAC-SHA256 signatures and OAuth state hashes use `crypto.timingSafeEqual` to eliminate timing attacks.
- **Safe Output & Redaction:** All SSE payloads recursively strip sensitive tokens (`password`, `apiKey`, `jwt_secret`, `accessToken`). Production error handlers suppress stack traces.
- **Input Sanitization:** Pull request webhook titles and descriptions strip prompt injection override strings before LLM ingestion.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
