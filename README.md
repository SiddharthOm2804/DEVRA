# DevPilot (Devra) - Production AI Developer Platform

DevPilot is an enterprise-grade AI developer platform uniting full-stack codebase intelligence, 3D interactive spatial dependency graphs, automated AST code reviews, vector RAG codebase search, autonomous AI Agent workflows, and editor-native VS Code extensions.

---

## Key Capabilities

- **Codebase Analysis Engine**: Automatically discovers modules, package dependencies, application entry points, and cyclomatic metrics across multi-language repositories.
- **3D Spatial Galaxy Visualizer**: High-performance Three.js WebGL graph clustering files by architectural domains (Frontend, Backend, Database, Services, Utilities) with smooth camera navigation and node inspection.
- **AI-Powered Code Review**: Deep AST scanning evaluating bugs, security vulnerabilities, performance bottlenecks, code smells, and cyclomatic complexity with line-level suggestions and auto-calculated scores.
- **Codebase Conversational Chat (RAG)**: Language-aware semantic vector retrieval providing grounded, accurate codebase answers accompanied by exact source file citations.
- **Autonomous AI Agent Mode**: End-to-end development agent: plans implementation &rarr; awaits user approval &rarr; generates code changes &rarr; shows side-by-side diff previews &rarr; provides safe, reversible application.
- **VS Code Extension**: Native integration with command palette, editor context menus, side-by-side diff preview editor (`vscode.diff`), and an interactive sidebar assistant.

---

## Architecture

```
DevPilot/
├── client/               # React 19, Vite, Tailwind CSS, Three.js, React Three Fiber
├── server/               # Node.js, Express, MongoDB (Mongoose), Helmet, CORS, Rate Limiting
├── extension/            # VS Code Extension (TypeScript, VS Code API)
├── docs/                 # Architecture, API endpoints, and Deployment guides
├── docker-compose.yml    # Full-stack container orchestration
├── ecosystem.config.cjs  # PM2 cluster configuration
└── .env.example          # Monorepo environment configuration template
```

---

## Quickstart

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **MongoDB**: v6.0+ (Local or MongoDB Atlas)
- **AI API Key**: Google Gemini (`AI_API_KEY`) or OpenAI Key

### 1. Installation
Install all dependencies across the monorepo:
```bash
npm run install:all
```

### 2. Environment Configuration
Copy the environment templates:
```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```
Ensure `server/.env` contains your `JWT_SECRET` and `AI_API_KEY`.

### 3. Launch Development Environment
Run both backend server and frontend client concurrently:
```bash
npm run dev
```
- **Web Cockpit**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:5000](http://localhost:5000)
- **Health Heartbeat**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 4. Build VS Code Extension
```bash
npm run build:extension
```
In VS Code, press `F5` or run "Debug: Start Debugging" in the extension folder to launch the Extension Development Host.

---

## Production Deployment

### Option A: Docker Compose
```bash
docker compose up -d --build
```
Orchestrates MongoDB, Node API server, and Nginx web client.

### Option B: Bare Metal / VM (PM2)
```bash
npm run build
pm2 start ecosystem.config.cjs
```

See [Deployment Guide](docs/deployment.md) for full configuration details.

---

## API Documentation
Complete specification of all 32 REST endpoints is available in [API Documentation](docs/api.md).

---

## License
MIT
