# DEVRA Security Architecture & Disclosure Policy

**Last Updated:** October 2026 (Phase 7 Release Hardening)  
**Security Status:** Audited & Hardened  

---

## 1. Threat Model & Security Posture

DEVRA processes sensitive software repository contents, architectural metadata, and developer authentication credentials. The system is engineered around defense-in-depth principles:

### 1.1 Authentication & Distributed Replay Resistance
- **Bcrypt Password Storage:** Passwords are salted and hashed with bcrypt (salt rounds = 10). Serialization overrides in Mongoose models strip `password` and `githubAccessToken` from all API responses.
- **Atomic Single-Use Tickets:** External OAuth handshake callbacks and VS Code extension pairing utilize high-entropy single-use tickets stored in Redis with short TTLs (120s). Redemption is performed atomically via Redis `GETDEL` (Redis 6.2+) and Lua script fallback (`GET + DEL`), preventing concurrent replay across multi-replica API deployments.
- **Strict JWT Token Verification:** API endpoints enforce signed JSON Web Tokens with expiry checks and algorithm constraints.

### 1.2 VS Code Extension & Workspace Isolation
- **Path Traversal Prevention:** The extension agent strictly inspects target filepaths before applying AI-proposed code modifications. Paths attempting parent directory traversals (`../`), root path escapes (`/`), Windows drive prefixes (`C:`), or UNC network shares (`//`) are rejected immediately.
- **In-Memory Pre-Apply Snapshots:** Before touching workspace files, the extension creates an in-memory snapshot of target file contents. Mid-batch write errors immediately trigger automated rollbacks, reverting modified files and unlinking newly created files.

### 1.3 Webhook Integrity & GitHub Integration
- **HMAC-SHA256 Webhook Verification:** Inbound GitHub pull request webhooks require valid `X-Hub-Signature-256` signatures verified using constant-time cryptographic comparisons (`crypto.timingSafeEqual`).
- **Duplicate Delivery Deduplication:** Delivery IDs (`X-GitHub-Delivery`) are tracked in memory/Redis to prevent replay attacks on webhook endpoints.
- **Prompt Injection Sanitization:** Untrusted inputs from PR titles, descriptions, and comments are sanitized to strip system prompt override attempts.

### 1.4 Network & Host Isolation
- **Loopback Service Bindings:** In `docker-compose.yml`, MongoDB and Redis are bound exclusively to `127.0.0.1` on the host, preventing network-wide database exposure.
- **CORS Allowlist:** Origin headers are strictly validated against an approved origin list in production mode. Empty origin headers (native extension tools, server-to-server) are permitted safely.

---

## 2. Sensitive Logging & Data Redaction

All structured server logs pass through sanitization middleware (`logger.js`). Sensitive query parameters, bearer tokens, ticket identifiers, email reset tokens, and passwords are automatically redacted before logs are written to stdout or persisted to disk.

---

## 3. Reporting Security Vulnerabilities

We take the security of DEVRA seriously. If you discover a vulnerability, please report it responsibly:

- **Email:** security@devra.ai (or submit a private security advisory on GitHub)
- **Do not** open public GitHub issues for security vulnerabilities.
- Provide a detailed reproduction guide or proof-of-concept.
- We will acknowledge receipt within 48 hours and work with you on a coordinated disclosure timeline.
