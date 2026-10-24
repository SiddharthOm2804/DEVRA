# DEVRA — Spatial AI Engineering Platform

[![CI/CD Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/SiddharthOm2804/DEVRA)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/backend%20tests-110%20passed-success.svg)](server/test.js)
[![Extension Tests](https://img.shields.io/badge/extension%20tests-10%20passed-success.svg)](extension/)
[![Design System](https://img.shields.io/badge/design-Abyssal%20Jade-047857.svg)](client/src/index.css)

> **DEVRA** is a developer platform integrating Tree-sitter WASM AST syntax extraction, vector-grounded semantic code analysis, real-time 3D Three.js codebase architecture visualization, and a VS Code extension with transactional agent safeguards and rollback capabilities.

---

## Key Capabilities

- **3D Codebase Architecture Visualizer:** High-performance WebGL force-directed layout rendering codebases across multi-level of detail (LOD 0 Overview, LOD 1 Modules, LOD 2 Classes/Symbols) with directional hysteresis boundary guards and GPU memory disposal.
- **Tree-sitter WASM AST Ingestion:** Syntax-aware code chunking for JavaScript, TypeScript, Python, and Go that extracts functions, classes, interfaces, and module imports into stable, deterministic chunk hashes.
- **Vector-Grounded Retrieval (RAG):** Redisearch (`devra:idx:codebase`) vector search and Memory fallback providing grounded code Q&A without hallucinatory references.
- **Atomic Single-Use Authentication:** Redis `GETDEL` (Redis 6.2+) and atomic Lua script fallbacks eliminate replay attacks across multi-instance load-balanced deployments.
- **VS Code Extension with Safety Snapshots:** AI agent mode proposing multi-file patches with native side-by-side diff previews, cross-platform path traversal protection (relative traversals, root escapes, Windows drive letters, UNC shares), and in-memory pre-apply snapshots for transactional rollback.
- **Production Observability:** Built-in Prometheus metrics export (`/metrics`) and OpenTelemetry tracing.

---

## Technology Stack

- **Client:** React 18, Vite, Three.js, Vanilla CSS Design Tokens (Abyssal Jade), Lucide Icons
- **Backend:** Node.js, Express 4, Mongoose, ioredis, Web Tree-sitter WASM, Prom-Client, OpenTelemetry
- **Extension:** TypeScript, VS Code Extensibility API, Custom Webview Diff Providers
- **Databases & Infrastructure:** MongoDB 7.0, Redis Stack (RediSearch & Pub/Sub), Docker Compose, Nginx

---

## Monorepo Structure

```
├── client/           # React 18 SPA (Vite, Three.js, Abyssal Jade theme)
├── server/           # Express API server, Tree-sitter WASM, Redis vector store
├── extension/        # VS Code TypeScript extension (Agent mode, Status bar)
├── shared/           # Cross-package models, contracts, and shared constants
├── e2e/              # Playwright browser end-to-end test suite
├── docker/           # Dockerfiles, Nginx configs, and compose templates
├── docs/             # Verified architecture, setup, deployment, and security guides
└── docker-compose.yml# Production container orchestration
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js v18 or v20 LTS
- npm v9+
- Docker Desktop (for MongoDB & Redis Stack)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/SiddharthOm2804/DEVRA.git
cd Devra

# Install dependencies across all workspaces
npm install

# Configure environment variables
cp .env.example .env

# Spin up MongoDB and Redis Stack containers
npm run dev:infra

# Run the backend and client concurrently
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Verification & Testing

DEVRA includes comprehensive automated test suites across all packages:

```bash
# Run backend integration tests (110 passing tests)
npm --prefix server test

# Run VS Code extension unit tests (10 passing tests)
npm --prefix extension test

# Compile extension TypeScript
npm --prefix extension run compile

# Run frontend production build
npm --prefix client run build
```

---

## Documentation

Detailed architectural runbooks and guides are maintained in `docs/`:
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md):** Complete verified system architecture, data flows, and subsystem designs.
- **[docs/SETUP.md](docs/SETUP.md):** Detailed local development setup and environment configuration.
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md):** Docker Compose deployment instructions, secret validation, and backup runbooks.
- **[docs/SECURITY.md](docs/SECURITY.md):** Security threat models, atomic ticket store validation, and disclosure policy.
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md):** Monorepo development conventions and pre-commit checks.
- **[docs/FINAL_RELEASE_REPORT.md](docs/FINAL_RELEASE_REPORT.md):** Release verification ledger, audit findings, and final verdict.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
