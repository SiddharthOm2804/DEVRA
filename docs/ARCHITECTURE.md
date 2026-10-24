# DEVRA System Architecture

**Last Updated:** October 2026 (Release Candidate Verification)  
**Status:** Validated  

---

## 1. High-Level Architecture Overview

DEVRA is a Spatial AI Engineering Workspace and Code Intelligence Platform designed for full-stack developers and software architects. It combines Tree-sitter AST syntax extraction, vector semantic retrieval, a 3D WebGL codebase visualizer, and a bidirectional VS Code extension with transactional agent safeguards.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  React 18 SPA (Vite)                                                   │
│  ├── Abyssal Jade Design System (Vanilla CSS Tokens)                   │
│  ├── Three.js 3D Force-Directed Code Graph (Multi-LOD Engine)          │
│  └── Real-time SSE / REST Client Services                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / SSE
┌───────────────────────────────────▼────────────────────────────────────┐
│                             API GATEWAY                                │
│  Node.js (Express 4) + Helmet + Rate Limiter + CORS Allowlist          │
│  ├── Prometheus Telemetry (/metrics) & OpenTelemetry Tracing           │
│  ├── JWT Authentication & Distributed Ticket Store (Redis GETDEL)      │
│  └── HMAC-SHA256 GitHub Webhook Processor                              │
└───────┬───────────────────────────┬────────────────────────────┬───────┘
        │                           │                            │
┌───────▼─────────────┐     ┌───────▼──────────────┐     ┌───────▼───────┐
│     MONGODB 7.0     │     │     REDIS STACK      │     │  AI / LLM     │
│  - User Accounts    │     │  - Redisearch Vector │     │  - Google     │
│  - Repositories     │     │  - Realtime EventBus │     │    Gemini     │
│  - Code Reviews     │     │  - Atomic Tickets    │     │  - OpenAI     │
│  - Agent Sessions   │     │  - Session Cache     │     │    Fallback   │
└─────────────────────┘     └──────────────────────┘     └───────────────┘
                                    ▲
                                    │ Bi-directional Agent Pairing
┌───────────────────────────────────┴────────────────────────────────────┐
│                          VS CODE EXTENSION                             │
│  TypeScript Extension Runtime                                          │
│  ├── In-Memory Pre-Apply Safety Snapshots & Rollback                   │
│  ├── Cross-Platform Path Traversal & Windows Drive Letter Isolation    │
│  └── Status Bar State Machine & Native Side-by-Side Diff Webviews      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 AI & Retrieval-Augmented Generation (RAG)
1. **Tree-sitter WASM Syntax Analysis:**
   - Syntax-aware chunking for JavaScript, TypeScript, Python, and Go.
   - Extracts semantic symbols: function declarations, classes, interfaces, and module imports.
   - Files exceeding 500KB or unsupported syntaxes safely fall back to bounded line-window chunking.
2. **Vector Store & Indexing:**
   - Multi-tier vector storage: Redisearch (`devra:idx:codebase`) for production deployments, and `MemoryVectorStore` for local development and deterministic testing.
   - Deterministic chunk hashing guarantees stable chunk IDs across re-indexing cycles.
3. **Truthfulness & Grounding:**
   - The query retriever synthesizes grounded LLM responses using verified repository snippets only. If no relevant chunks exist or the AI provider fails, an explicit failure notification is returned without fabricating simulated code or phantom filenames.

### 2.2 3D Codebase Visualizer (WebGL / Three.js)
- **Hierarchical Domain Partitioning:** 5 spatial domain hubs (Frontend UI, API Gateway, Services/Logic, Data/Models, Config/Infrastructure) maintain orientation regardless of graph density.
- **Dynamic Level-of-Detail (LOD):**
  - **LOD 0 (Overview):** Renders high-level domain hubs and primary subsystem boundaries.
  - **LOD 1 (Modules):** Renders directory clusters and high-degree hub nodes.
  - **LOD 2 (Files & Classes):** Renders individual files and AST symbol details.
- **Hysteresis Boundary Protection:** Distance thresholds utilize directional hysteresis padding to eliminate visual flicker and rapid LOD oscillation at cluster boundaries.
- **GPU Resource Lifecycle:** Materials, line buffers, and geometries are explicitly tracked and disposed on component unmounting.

### 2.3 Distributed Security & Replay-Resistant Authentication
- **Atomic Ticket Store:** External OAuth handshakes and VS Code pairing use single-use tickets stored with strict TTLs in Redis. Redemptions execute via Redis native `GETDEL` (Redis 6.2+) with an atomic Lua script fallback, guaranteeing that only one process can redeem a ticket in multi-instance load-balanced clusters.
- **Fail-Closed Security:** In production mode (`NODE_ENV=production`), missing secrets (`JWT_SECRET`, `GITHUB_WEBHOOK_SECRET`) cause the application to halt immediately on startup.
- **Strict Network Isolation:** In Docker Compose, MongoDB (27017) and Redis (6379) are bound strictly to `127.0.0.1` (loopback).

### 2.4 VS Code Extension & Transactional Agent Rollback
- **Pre-Apply Backup Snapshots:** Before any file is modified or created during AI agent plan execution, the extension records an in-memory transactional snapshot of existing file contents.
- **Transactional Rollback:** If any write operation fails or throws an exception mid-batch, all modified files are restored to their previous state, and newly created files are unlinked.
- **Path Traversal Hardening:** File modifications are evaluated against workspace roots. Relative parent references (`../`), absolute root slashes, Windows drive letters (`C:`), and UNC paths (`//`) are rejected.
