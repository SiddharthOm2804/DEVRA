# DEVRA Local Development Setup Guide

This guide walks you through setting up DEVRA for local development, unit testing, and full-stack debugging.

---

## 1. Prerequisites

- **Node.js:** v18.x or v20.x LTS
- **npm:** v9.x or higher
- **Docker Desktop:** Required for running MongoDB and Redis Stack locally
- **Git:** Required for repository management

---

## 2. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/SiddharthOm2804/DEVRA.git
cd Devra

# Install dependencies across all workspaces (client, server, extension, shared)
npm install
```

---

## 3. Environment Configuration

Copy the example environment configuration into your root directory:

```bash
cp .env.example .env
```

Review the values in `.env`:
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/devra
REDIS_HOST=localhost
REDIS_PORT=6379
VECTOR_STORE=memory

# For development, you can use placeholder values
JWT_SECRET=development_jwt_secret_devra_workspace_local_min32chars
GITHUB_WEBHOOK_SECRET=development_github_webhook_secret_min32chars

# AI Provider (optional for mock/offline dev)
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key
```

---

## 4. Starting Infrastructure Services

To spin up MongoDB and Redis Stack containers:

```bash
npm run dev:infra
```

Alternatively, you can run tests with `VECTOR_STORE=memory` without requiring Redis Stack.

---

## 5. Running the Application

In root directory, start both the API server and the Vite client concurrently:

```bash
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **Health Endpoint:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Prometheus Metrics:** [http://localhost:5000/metrics](http://localhost:5000/metrics)

---

## 6. Developing the VS Code Extension

```bash
cd extension
npm install
npm run compile
npm test
```

Press `F5` in VS Code to open an **Extension Development Host** window to test the extension live.
