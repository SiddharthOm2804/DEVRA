# Phase 6 Deployment & Staging Verification Guide: DEVRA

**Scope:** Production Deployment, Staging Environment Setup, Reverse Proxy & TLS Configuration, Operational Runbooks  
**Assessor:** DevOps & Site Reliability Engineer  
**Date:** October 25, 2026  

---

## 1. Architecture & Component Topology

DEVRA operates as a multi-tier containerized stack orchestrated via Docker Compose or Kubernetes:
- **Client (Frontend):** React + Vite SPA served via Nginx reverse proxy with gzip compression and cache controls.
- **Server (Backend API):** Node.js Express service running behind process clustering / container replicas, exporting Prometheus telemetry.
- **MongoDB (Primary Store):** MongoDB 7.0 storing persistent user accounts, repository metadata, agent sessions, and AST node summaries.
- **Redis Stack (Cache, Event Bus & Vectors):** Redis Stack Server providing in-memory key-value caching, Pub/Sub event bus, single-use ticket storage, and Redisearch vector indexing.

---

## 2. Environment Configuration Contracts

Before starting production or staging services, copy `.env.example` to `.env` and verify mandatory secrets:

```bash
# Core Environment
PORT=5000
NODE_ENV=production
CLIENT_URL=https://devra.example.com

# Persistence Connections
MONGODB_URI=mongodb://mongodb:27017/devra
REDIS_HOST=redis
REDIS_PORT=6379
VECTOR_STORE=redis

# Security Secrets (Must be at least 32 characters in production)
JWT_SECRET=super_secret_production_key_minimum_32_chars_long
GITHUB_WEBHOOK_SECRET=super_secret_github_webhook_key_32_chars_long

# Optional Integrations
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_or_openai_api_key
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret
GITHUB_CALLBACK_URL=https://devra.example.com/api/auth/github/callback
```

---

## 3. Deployment Procedures

### Step 1: Pre-Deployment Validation
Verify all dependencies and builds prior to pushing container images:
```bash
# 1. Backend tests
npm --prefix server test

# 2. Extension compilation and tests
npm --prefix extension test
npm --prefix extension run compile

# 3. Client production build
npm --prefix client run build
```

### Step 2: Build & Launch Containers
```bash
# Build and spin up the complete stack in detached mode
docker compose up --build -d

# Verify container health status
docker compose ps
```

### Step 3: Health & Readiness Probes
Confirm healthy services via HTTP endpoints:
- **API Health:** `GET /api/health` -> `{"status":"ok","timestamp":"..."}`
- **Prometheus Metrics:** `GET /api/metrics` (Requires `METRICS_AUTH_TOKEN` header if configured).

---

## 4. Disaster Recovery & Operational Runbooks

### Database Backups
- **MongoDB:**
  ```bash
  docker compose exec mongodb mongodump --out=/data/db/backups/$(date +%Y%m%d_%H%M%S)
  ```
- **Redis Vector & Ticket Store:**
  ```bash
  docker compose exec redis redis-cli BGSAVE
  ```

### Graceful Shutdown
DEVRA services intercept `SIGTERM` and `SIGINT` signals, closing open MongoDB connections, unsubscribing from Redis Pub/Sub channels, and finishing in-flight HTTP requests before exiting.
