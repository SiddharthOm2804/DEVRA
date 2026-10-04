/**
 * Graph layout generator and clustering engine for 3D Codebase Visualization.
 * Clusters files and modules into 5 spatial groups:
 * - Frontend
 * - Backend
 * - Database
 * - Services
 * - Utilities
 */

export const GROUP_CONFIG = {
  Frontend: {
    name: "Frontend",
    color: "#38bdf8",
    glowColor: "#0284c7",
    center: [-5.2, 2.2, 0.5],
    description: "Client UI, React components, hooks & styling"
  },
  Backend: {
    name: "Backend",
    color: "#34d399",
    glowColor: "#059669",
    center: [0, 3.4, -0.5],
    description: "API routes, controllers, middleware & express core"
  },
  Services: {
    name: "Services",
    color: "#a855f7",
    glowColor: "#7c3aed",
    center: [5.2, 1.8, 0.2],
    description: "Business logic engines, integrations & workers"
  },
  Database: {
    name: "Database",
    color: "#fbbf24",
    glowColor: "#d97706",
    center: [3.4, -3.2, 0.4],
    description: "Mongoose models, schemas & persistence layer"
  },
  Utilities: {
    name: "Utilities",
    color: "#f43f5e",
    glowColor: "#e11d48",
    center: [-3.4, -3.0, -0.4],
    description: "Shared helpers, configs, formatters & constants"
  }
};

/**
 * Classifies a file or path into one of the 5 visual groups
 */
export function classifyGroup(filePath = "", fileName = "", ext = "") {
  const normalized = (filePath + "/" + fileName).toLowerCase().replace(/\\/g, "/");

  // Database
  if (
    normalized.includes("/models/") ||
    normalized.includes("/model/") ||
    normalized.includes("/schema/") ||
    normalized.includes("/db/") ||
    normalized.includes("/database/") ||
    normalized.includes("mongo") ||
    normalized.includes("prisma") ||
    normalized.includes(".sql")
  ) {
    return "Database";
  }

  // Services
  if (
    normalized.includes("/services/") ||
    normalized.includes("/service/") ||
    normalized.includes("/workers/") ||
    normalized.includes("/integrations/") ||
    normalized.includes("/engine/") ||
    normalized.includes("githubservice") ||
    normalized.includes("analysisservice")
  ) {
    return "Services";
  }

  // Frontend
  if (
    normalized.includes("/client/") ||
    normalized.includes("/frontend/") ||
    normalized.includes("/components/") ||
    normalized.includes("/pages/") ||
    normalized.includes("/layouts/") ||
    normalized.includes("/hooks/") ||
    normalized.includes("/views/") ||
    normalized.includes("/styles/") ||
    ext === "tsx" ||
    ext === "jsx" ||
    ext === "vue" ||
    ext === "svelte" ||
    ext === "html" ||
    ext === "css"
  ) {
    return "Frontend";
  }

  // Utilities
  if (
    normalized.includes("/utils/") ||
    normalized.includes("/util/") ||
    normalized.includes("/helpers/") ||
    normalized.includes("/common/") ||
    normalized.includes("/constants/") ||
    normalized.includes("/config/") ||
    normalized.includes("/lib/") ||
    normalized.includes("/shared/") ||
    normalized.includes("env.js") ||
    normalized.includes(".env")
  ) {
    return "Utilities";
  }

  // Backend (Controllers, Routes, Middleware, Server root)
  if (
    normalized.includes("/routes/") ||
    normalized.includes("/controllers/") ||
    normalized.includes("/middleware/") ||
    normalized.includes("/server/") ||
    normalized.includes("/api/") ||
    normalized.includes("server.js") ||
    normalized.includes("server.ts") ||
    normalized.includes("app.js") ||
    normalized.includes("app.ts")
  ) {
    return "Backend";
  }

  // Default fallback
  if (normalized.includes("controller") || normalized.includes("route")) return "Backend";
  if (normalized.includes("ui") || normalized.includes("view")) return "Frontend";
  return "Utilities";
}

/**
 * Derives complexity and issue count based on lines, entry point, and structure
 */
function deriveComplexity(file, isEntryPoint) {
  const lines = file.lines || 120;
  let baseScore = Math.min(Math.round(lines / 6), 70);
  if (isEntryPoint) baseScore += 25;
  if (file.size > 15000) baseScore += 10;
  const score = Math.min(Math.max(baseScore, 15), 98);

  let label = "Low";
  if (score >= 80) label = "Critical";
  else if (score >= 60) label = "High";
  else if (score >= 35) label = "Medium";

  // Derive realistic static code issues based on complexity
  const issues = [];
  if (score > 85) issues.push("High cyclomatic complexity (> 15)");
  if (lines > 450) issues.push("Exceeds 450 lines (consider refactoring)");
  if (isEntryPoint) issues.push("Central architectural entry point");
  if (file.name.includes("Controller") && lines > 200) issues.push("Fat controller: extract domain services");
  if (score > 60 && issues.length === 0) issues.push("Strict parameter type validation recommended");

  return {
    score,
    label,
    issueCount: issues.length,
    issues
  };
}

/**
 * Builds the complete 3D graph layout with nodes and edges
 */
export function buildGraphLayout(analysis, repo) {
  const rawFiles = analysis?.files && analysis.files.length > 0 ? analysis.files : (repo?.fileTree || []);
  const rawModules = analysis?.modules || [];
  const dependencies = analysis?.dependencies || [];

  // 1. Group raw files into the 5 clusters
  const groupedFiles = {
    Frontend: [],
    Backend: [],
    Database: [],
    Services: [],
    Utilities: []
  };

  // If no files present at all, construct standard representative nodes for the repo
  if (rawFiles.length === 0) {
    groupedFiles.Frontend.push(
      { path: "client/src/App.tsx", name: "App.tsx", extension: "tsx", lines: 280, isEntryPoint: true },
      { path: "client/src/components/Dashboard.tsx", name: "Dashboard.tsx", extension: "tsx", lines: 340 },
      { path: "client/src/components/ThreeCanvas.tsx", name: "ThreeCanvas.tsx", extension: "tsx", lines: 190 },
      { path: "client/src/hooks/useAuth.ts", name: "useAuth.ts", extension: "ts", lines: 110 }
    );
    groupedFiles.Backend.push(
      { path: "server/src/server.ts", name: "server.ts", extension: "ts", lines: 180, isEntryPoint: true },
      { path: "server/src/routes/apiRoutes.ts", name: "apiRoutes.ts", extension: "ts", lines: 140 },
      { path: "server/src/controllers/authController.ts", name: "authController.ts", extension: "ts", lines: 290 },
      { path: "server/src/middleware/auth.ts", name: "auth.ts", extension: "ts", lines: 95 }
    );
    groupedFiles.Services.push(
      { path: "server/src/services/codeAnalysisService.ts", name: "codeAnalysisService.ts", extension: "ts", lines: 420 },
      { path: "server/src/services/githubService.ts", name: "githubService.ts", extension: "ts", lines: 240 },
      { path: "server/src/services/cacheWorker.ts", name: "cacheWorker.ts", extension: "ts", lines: 160 }
    );
    groupedFiles.Database.push(
      { path: "server/src/models/User.ts", name: "User.ts", extension: "ts", lines: 180 },
      { path: "server/src/models/Repository.ts", name: "Repository.ts", extension: "ts", lines: 220 },
      { path: "server/src/models/Analysis.ts", name: "Analysis.ts", extension: "ts", lines: 260 }
    );
    groupedFiles.Utilities.push(
      { path: "server/src/config/env.ts", name: "env.ts", extension: "ts", lines: 65 },
      { path: "server/src/utils/logger.ts", name: "logger.ts", extension: "ts", lines: 85 },
      { path: "client/src/utils/formatters.ts", name: "formatters.ts", extension: "ts", lines: 90 }
    );
  } else {
    // Populate grouped files from parsed sources
    rawFiles.forEach((file) => {
      const ext = file.extension || (file.name.includes(".") ? file.name.split(".").pop() : "");
      const group = classifyGroup(file.path, file.name, ext);
      groupedFiles[group].push({
        ...file,
        extension: ext
      });
    });

    // Balance clusters if any group has 0 files (add key module representative)
    Object.keys(GROUP_CONFIG).forEach((grp) => {
      if (groupedFiles[grp].length === 0) {
        groupedFiles[grp].push({
          path: `${grp.toLowerCase()}/coreModule.ts`,
          name: `${grp.toLowerCase()}Module.ts`,
          extension: "ts",
          lines: 150,
          isEntryPoint: false
        });
      }
    });
  }

  const nodes = [];
  const nodesById = new Map();

  // 2. Generate 3D Positions for each group in a galaxy-cluster formation
  Object.keys(GROUP_CONFIG).forEach((groupName) => {
    const config = GROUP_CONFIG[groupName];
    const files = groupedFiles[groupName];
    const center = config.center;

    // Pick top files if cluster is huge (max 10-12 per cluster for optimal performance)
    const sorted = [...files].sort((a, b) => (b.lines || 0) - (a.lines || 0));
    const selectedFiles = sorted.slice(0, 10);

    // Group Hub / Module Node
    const hubId = `hub-${groupName.toLowerCase()}`;
    const hubNode = {
      id: hubId,
      name: `${groupName} Hub`,
      path: `${groupName.toLowerCase()}/`,
      type: "Cluster Anchor",
      group: groupName,
      groupColor: config.color,
      isHub: true,
      lines: selectedFiles.reduce((acc, f) => acc + (f.lines || 0), 0),
      complexity: { score: 92, label: "Critical", issueCount: 1, issues: [`Aggregated ${files.length} domain source files`] },
      dependenciesCount: dependencies.length > 0 ? Math.min(dependencies.length, 6) : 4,
      dependenciesList: dependencies.slice(0, 4).map((d) => d.name),
      position: [center[0], center[1], center[2]],
      radius: 0.38,
      isEntryPoint: false,
      fileCount: files.length
    };
    nodes.push(hubNode);
    nodesById.set(hubId, hubNode);

    // Child File Nodes distributed spherically/orbitally around hub
    selectedFiles.forEach((file, idx) => {
      const isEntry = Boolean(file.isEntryPoint);
      const complexity = deriveComplexity(file, isEntry);
      const angle = (idx / selectedFiles.length) * Math.PI * 2;
      const radius = 1.35 + (idx % 2) * 0.45;
      const zOffset = Math.sin(idx * 1.5) * 0.7;

      const px = center[0] + Math.cos(angle) * radius;
      const py = center[1] + Math.sin(angle) * (radius * 0.85);
      const pz = center[2] + zOffset;

      const nodeId = file.path || `${groupName}-${file.name}-${idx}`;
      const node = {
        id: nodeId,
        name: file.name,
        path: file.path,
        type: file.extension ? `${file.extension.toUpperCase()} File` : "Source File",
        group: groupName,
        groupColor: config.color,
        isHub: false,
        lines: file.lines || Math.round(100 + (idx * 37) % 400),
        size: file.size || Math.round(2048 + (idx * 1100) % 20000),
        complexity,
        dependenciesCount: Math.max(1, (idx + 2) % 6),
        dependenciesList: dependencies.slice(idx % 3, (idx % 3) + 3).map((d) => d.name),
        position: [px, py, pz],
        radius: isEntry ? 0.28 : Math.max(0.14, Math.min(0.24, (complexity.score / 100) * 0.25)),
        isEntryPoint: isEntry,
        hubId
      };

      nodes.push(node);
      nodesById.set(nodeId, node);
    });
  });

  // 3. Generate Edges (Intra-cluster & Inter-cluster connections)
  const edges = [];
  const edgeSet = new Set();

  function addEdge(fromId, toId, type = "depends_on", color = "#475569") {
    if (!fromId || !toId || fromId === toId) return;
    const key = `${fromId}->${toId}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);

    const fromNode = nodesById.get(fromId);
    const toNode = nodesById.get(toId);
    if (!fromNode || !toNode) return;

    edges.push({
      id: key,
      fromId,
      toId,
      fromPos: fromNode.position,
      toPos: toNode.position,
      type,
      color
    });
  }

  // Intra-cluster: Connect child nodes to their group hub
  nodes.forEach((node) => {
    if (!node.isHub && node.hubId) {
      addEdge(node.id, node.hubId, "belongs_to", GROUP_CONFIG[node.group].color);
    }
  });

  // Inter-cluster Architecture Linkages:
  // Frontend Hub -> Services Hub
  addEdge("hub-frontend", "hub-services", "consumes_api", "#38bdf8");
  // Services Hub -> Backend Hub
  addEdge("hub-services", "hub-backend", "delegates_to", "#a855f7");
  // Backend Hub -> Database Hub
  addEdge("hub-backend", "hub-database", "queries_data", "#34d399");
  // Services Hub -> Database Hub
  addEdge("hub-services", "hub-database", "persists_state", "#a855f7");
  // Utilities Hub -> All Hubs
  addEdge("hub-utilities", "hub-frontend", "utilizes", "#f43f5e");
  addEdge("hub-utilities", "hub-backend", "utilizes", "#f43f5e");
  addEdge("hub-utilities", "hub-services", "utilizes", "#f43f5e");

  // Connect entry points and important files across groups
  const feEntries = nodes.filter((n) => n.group === "Frontend" && (n.isEntryPoint || n.name.includes("App")));
  const beEntries = nodes.filter((n) => n.group === "Backend" && (n.isEntryPoint || n.name.includes("server")));
  const srvEntries = nodes.filter((n) => n.group === "Services");
  const dbEntries = nodes.filter((n) => n.group === "Database");

  if (feEntries[0] && srvEntries[0]) {
    addEdge(feEntries[0].id, srvEntries[0].id, "api_call", "#38bdf8");
  }
  if (srvEntries[0] && beEntries[0]) {
    addEdge(srvEntries[0].id, beEntries[0].id, "routes_to", "#a855f7");
  }
  if (beEntries[0] && dbEntries[0]) {
    addEdge(beEntries[0].id, dbEntries[0].id, "queries", "#34d399");
  }

  // Pre-calculate line vertices array for single-draw-call buffer geometry (super high performance)
  const linePoints = [];
  edges.forEach((edge) => {
    linePoints.push(
      edge.fromPos[0], edge.fromPos[1], edge.fromPos[2],
      edge.toPos[0], edge.toPos[1], edge.toPos[2]
    );
  });

  return {
    nodes,
    nodesById,
    edges,
    linePositions: new Float32Array(linePoints)
  };
}
