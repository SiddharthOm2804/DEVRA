# DEVRA Production Deployment & Operations Guide

**Last Updated:** October 2026 (Phase 7 Release Hardening)  
**Status:** Validated  

---

## 1. Overview & Topologies

DEVRA is designed for containerized deployment via Docker Compose or Kubernetes. The production stack consists of four core services:
1. **Frontend (`devpilot-web`):** Pre-built React SPA served via Nginx with HTTP compression and cache headers.
2. **Backend API (`devpilot-api`):** Node.js Express service running in cluster or replica mode with Prometheus telemetry.
3. **MongoDB (`devpilot-mongo`):** MongoDB 7.0 database engine with healthchecks and persistent volume storage.
4. **Redis Stack (`devpilot-redis`):** Redis Stack Server with RediSearch module for vector similarity queries, real-time pub/sub event bus, and atomic single-use ticket store.

---

## 2. Production Environment Requirements

Production deployments require a `.env` file populated with secure, high-entropy secrets:

```ini
PORT=5000
NODE_ENV=production
CLIENT_URL=https://devra.yourdomain.com

MONGODB_URI=mongodb://mongodb:27017/devra
REDIS_HOST=redis
REDIS_PORT=6379
VECTOR_STORE=redis

# MANDATORY: Minimum 32-character high-entropy strings
JWT_SECRET=YOUR_SECURE_JWT_SECRET_MINIMUM_32_CHARACTERS_LONG
GITHUB_WEBHOOK_SECRET=YOUR_SECURE_WEBHOOK_SECRET_MINIMUM_32_CHARACTERS

# Optional GitHub OAuth Integration
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_CALLBACK_URL=https://devra.yourdomain.com/api/auth/github/callback

# Optional AI Provider Keys
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_or_openai_api_key

# Optional Metrics Authorization
METRICS_AUTH_TOKEN=your_secure_bearer_token_for_prometheus
```

---

## 3. Deployment Steps

### Step 1: Pre-Deployment Build & Verification
```bash
# 1. Verify backend unit & integration tests
npm --prefix server test

# 2. Verify VS Code extension compilation & unit tests
npm --prefix extension test
npm --prefix extension run compile

# 3. Build frontend client bundle
npm --prefix client run build
```

### Step 2: Build and Launch Containers
```bash
# Build and run containers in detached mode
docker compose up --build -d

# Check running status of services
docker compose ps
```

### Step 3: Health & Readiness Probes
Verify container health:
- `GET /api/health` -> returns `status: "ok"` and database/vectorStore connectivity.
- `GET /metrics` -> returns Prometheus text formatted metrics.

---

## 4. Security & Network Hardening

- **Loopback Port Isolation:** In `docker-compose.yml`, MongoDB (`127.0.0.1:27017`) and Redis (`127.0.0.1:6379`) are bound strictly to host loopback to prevent external network access.
- **Fail-Closed Secret Validation:** `server/src/utils/validateEnv.js` validates that `JWT_SECRET` and `GITHUB_WEBHOOK_SECRET` are not defaults, placeholders, or under 32 characters in production. If insecure, the server refuses to start.
- **Graceful Shutdown:** The server intercepts `SIGTERM` and `SIGINT`, cleanly terminates open database/Redis connections, and lets in-flight requests complete before terminating.

---

## 5. Backup & Recovery Runbooks

### MongoDB Database Dump
```bash
docker compose exec mongodb mongodump --out=/data/db/backups/$(date +%Y%m%d_%H%M%S)
```

### Redis Vector & Cache Snapshot
```bash
docker compose exec redis redis-cli BGSAVE
```
