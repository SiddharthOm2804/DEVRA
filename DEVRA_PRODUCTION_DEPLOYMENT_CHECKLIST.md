# DEVRA V1.0 — Production Deployment & Pre-Launch Checklist

This checklist must be reviewed and executed prior to deploying DEVRA into staging or production infrastructure.

---

## 1. Secrets, Environment Variables & Configuration
- [ ] **JWT Secret Rotation**: Generate a cryptographically random string (min 32 bytes) for `JWT_SECRET`. Do not use default or placeholder keys.
- [ ] **GitHub Webhook HMAC Secret**: Set a unique, high-entropy secret for `GITHUB_WEBHOOK_SECRET` and configure the exact same secret in GitHub Repository / Organization Webhook settings.
- [ ] **AI Provider Keys**: Provide valid API key for `AI_API_KEY` (Google Gemini or OpenAI). Verify rate limits and quota allocations with the upstream provider.
- [ ] **Environment Template Hygiene**: Verify that `.env` is listed in `.gitignore` and that no private credentials or tokens exist in `.env.example`.
- [ ] **Trusted Origins**: Configure `CLIENT_URL` to the exact public HTTPS domain of the web client. Confirm Helmet and CORS headers disallow unauthorized origins.

---

## 2. Infrastructure & Persistence

### MongoDB 7.0+
- [ ] **Replica Set**: Use a production MongoDB Atlas or managed replica set with TLS enabled.
- [ ] **Authentication & Network**: Ensure database credentials use dedicated least-privilege user accounts. Restrict access via VPC peering or IP allowlists.
- [ ] **Indexes**: Verify unique indexes on `users.email` and `repositories.userId + name`.
- [ ] **Readiness Probe**: Verify `/api/health/ready` returns HTTP 200 when MongoDB is connected.

### Redis Stack (Vector Store & Real-Time EventBus)
- [ ] **Redis Stack Server**: Verify Redis server is running with the RediSearch module enabled (`redis/redis-stack-server:latest` or Redis Cloud with RediSearch).
- [ ] **Persistence**: Enable AOF (Append-Only File) or RDB snapshots for Redis volume persistence (`devpilot-redis-data`).
- [ ] **TLS & Auth**: Set `REDIS_PASSWORD` and enable `REDIS_TLS=true` when connecting over public networks.
- [ ] **Memory Vector Store Guard**: In production, ensure `VECTOR_STORE=redis`. Monitor logs to confirm Redis connection succeeds rather than falling back to memory mode.

---

## 3. Security, RBAC & Boundaries
- [ ] **Ownership Isolation**: Confirm negative authorization guards prevent User A from reading or modifying User B's private repositories, Agent sessions, or SSE streams.
- [ ] **Role Permissions**: Ensure Guest accounts are restricted from triggering AI Agent planning/applying or creating repositories.
- [ ] **HMAC Signature Enforcement**: Confirm GitHub webhooks reject requests missing or supplying invalid `X-Hub-Signature-256` signatures with HTTP 401.
- [ ] **Input Sanitization**: Confirm user prompts, pull request titles, and diffs are sanitized against prompt injection patterns (`[FILTERED_INSTRUCTION]`).
- [ ] **File Size Boundary**: Verify AST parser ignores files larger than 500KB and falls back to window chunking safely.

---

## 4. Observability, Health & Telemetry
- [ ] **Scrape Protection**: If `/metrics` is exposed to external networks, configure `METRICS_AUTH_TOKEN` and supply `Authorization: Bearer <token>` in Prometheus `prometheus.yml`.
- [ ] **Prometheus Ingestion**: Verify Prometheus scrapes `devra-server:5000/metrics` every 10–15 seconds without HTTP 4xx/5xx errors.
- [ ] **Grafana Dashboard**: Import `grafana/dashboards/devra-observability.json` into Grafana and confirm panels reflect real query rates, latencies, and active task gauges.
- [ ] **OpenTelemetry**: If distributed tracing is required, set `OTEL_ENABLED=true` and configure the OTLP exporter endpoint. Verify no raw secrets or tokens appear in span attributes.
- [ ] **Liveness vs. Readiness**:
  - Kubernetes liveness probe &rarr; `/api/health`
  - Kubernetes readiness probe &rarr; `/api/health/ready`

---

## 5. VS Code Extension Deployment
- [ ] **Compilation**: Verify `npm --prefix extension run compile` compiles without TypeScript errors.
- [ ] **Unit Tests**: Confirm `npm --prefix extension test` passes all 10 unit test cases.
- [ ] **Token Keychain**: Verify the extension stores user JWTs securely via VS Code `context.secrets` rather than plaintext settings.
- [ ] **Status Bar**: Confirm the status bar item displays correct icons (`$(check) DEVRA: Ready`, `$(sync~spin) Agent Running`, `$(plug) Connect`) and sanitizes tokens from hover tooltips.

---

## 6. Pre-Launch Smoke Tests & Rollback Strategy
- [ ] **Pre-Launch Smoke Test**:
  1. Register a new user account.
  2. Log in and verify JWT issuance.
  3. Create/connect a repository and trigger codebase analysis.
  4. Initiate an AI Agent Mode task and verify SSE progress stream.
  5. Check `/metrics` and confirm counter increments for HTTP, Agent, and SSE.
- [ ] **Rollback Plan**:
  - Keep previous Docker image tags available in the container registry.
  - Test database rollback procedures and backup restoration from snapshots before cutover.
