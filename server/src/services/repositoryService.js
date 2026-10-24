import Repository from "../models/Repository.js";
import User from "../models/User.js";
import Analysis from "../models/Analysis.js";
import { deleteRepositoryVectors } from "./retriever.js";
import * as githubService from "./githubService.js";

/**
 * Curated seed repositories to provide new users an immediate, rich developer dashboard.
 */
export const DEFAULT_SEED_REPOSITORIES = [
  {
    name: "devra-core",
    description: "Core AST parsing engine, distributed task runners, and code intelligence pipeline.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 1240,
    forks: 182,
    health: 96,
    qualityGrade: "A+",
    securityStatus: "Secure",
    openIssues: 4,
    activeBranch: "main",
    branchCount: 8,
    commitCount: 1420,
    testCoverage: 92.5,
    contributors: 14,
    filesCount: 184,
    gitUrl: "https://github.com/devpilot-ai/devra-core.git",
    fileTree: [
      { name: "src/parser/astWorker.ts", size: "12.4 KB", commit: "Optimize AST traversal cache", time: "18m ago", type: "file" },
      { name: "src/services/codeAnalysisService.js", size: "28.1 KB", commit: "Refactor static rule engine", time: "2h ago", type: "file" },
      { name: "src/renderers/NodeGraph.jsx", size: "18.6 KB", commit: "Instanced mesh buffer streaming", time: "3h ago", type: "file" },
      { name: "src/routes/healthRoutes.js", size: "3.2 KB", commit: "Standardize health response", time: "Yesterday", type: "file" },
      { name: "docs/architecture.md", size: "8.5 KB", commit: "Add 3D visualizer specs", time: "2 days ago", type: "file" },
      { name: "package.json", size: "1.2 KB", commit: "Bump dependencies", time: "3 days ago", type: "file" }
    ]
  },
  {
    name: "api-gateway",
    description: "High-throughput edge reverse proxy, JWT authentication, and token bucket rate limiter.",
    language: "Go",
    languageColor: "#00add8",
    stars: 840,
    forks: 94,
    health: 98,
    qualityGrade: "A+",
    securityStatus: "Secure",
    openIssues: 2,
    activeBranch: "main",
    branchCount: 5,
    commitCount: 890,
    testCoverage: 95.1,
    contributors: 8,
    filesCount: 68,
    gitUrl: "https://github.com/devpilot-ai/api-gateway.git",
    fileTree: [
      { name: "cmd/gateway/main.go", size: "6.8 KB", commit: "Add graceful shutdown hook", time: "35m ago", type: "file" },
      { name: "pkg/proxy/reverse.go", size: "14.2 KB", commit: "Zero-alloc connection pool", time: "4h ago", type: "file" },
      { name: "pkg/auth/jwt.go", size: "9.1 KB", commit: "Ed25519 signature validation", time: "1d ago", type: "file" },
      { name: "go.mod", size: "1.8 KB", commit: "Upgrade gorilla/mux", time: "5d ago", type: "file" }
    ]
  },
  {
    name: "frontend-dashboard",
    description: "Next-gen developer cockpit with Three.js WebGL visualizer, Tailwind styling, and dark theme.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 620,
    forks: 58,
    health: 91,
    qualityGrade: "A",
    securityStatus: "Secure",
    openIssues: 7,
    activeBranch: "develop",
    branchCount: 6,
    commitCount: 670,
    testCoverage: 84.3,
    contributors: 6,
    filesCount: 142,
    gitUrl: "https://github.com/devpilot-ai/frontend-dashboard.git",
    fileTree: [
      { name: "src/App.jsx", size: "2.4 KB", commit: "Add protected route shell", time: "1h ago", type: "file" },
      { name: "src/components/3d/Scene.jsx", size: "11.2 KB", commit: "OrbitControls damping tuning", time: "6h ago", type: "file" },
      { name: "src/pages/DashboardPage.jsx", size: "14.6 KB", commit: "Realtime metric tickers", time: "1d ago", type: "file" }
    ]
  },
  {
    name: "cloud-orchestrator",
    description: "Kubernetes operator for autonomous container placement, blue-green rollouts, and auto-scaling.",
    language: "Rust",
    languageColor: "#dea584",
    stars: 1890,
    forks: 230,
    health: 99,
    qualityGrade: "A+",
    securityStatus: "Secure",
    openIssues: 1,
    activeBranch: "main",
    branchCount: 12,
    commitCount: 2450,
    testCoverage: 97.8,
    contributors: 22,
    filesCount: 310,
    gitUrl: "https://github.com/devpilot-ai/cloud-orchestrator.git",
    fileTree: [
      { name: "src/main.rs", size: "4.5 KB", commit: "Tokio multi-thread scheduler", time: "12m ago", type: "file" },
      { name: "src/reconciler.rs", size: "22.3 KB", commit: "Handle CRD spec updates", time: "2h ago", type: "file" },
      { name: "Cargo.toml", size: "2.1 KB", commit: "Update kube-rs version", time: "3d ago", type: "file" }
    ]
  },
  {
    name: "neural-ast-scanner",
    description: "Deep learning embedding model for semantic vulnerability detection and pattern recognition.",
    language: "Python",
    languageColor: "#3572A5",
    stars: 950,
    forks: 110,
    health: 88,
    qualityGrade: "B+",
    securityStatus: "Notice",
    openIssues: 10,
    activeBranch: "research",
    branchCount: 4,
    commitCount: 430,
    testCoverage: 79.4,
    contributors: 5,
    filesCount: 95,
    gitUrl: "https://github.com/devpilot-ai/neural-ast-scanner.git",
    fileTree: [
      { name: "scanner/model.py", size: "16.4 KB", commit: "Add CodeBERT attention layer", time: "45m ago", type: "file" },
      { name: "scanner/tokenizer.py", size: "8.9 KB", commit: "Handle tree-sitter tokens", time: "3h ago", type: "file" },
      { name: "pyproject.toml", size: "1.4 KB", commit: "Add torch dependency", time: "1w ago", type: "file" }
    ]
  }
];

/**
 * Seed a user with initial curated repositories if they have none
 */
export const seedUserRepositories = async (userId) => {
  const existingCount = await Repository.countDocuments({ userId });
  if (existingCount > 0) {
    return await Repository.find({ userId }).sort({ stars: -1 });
  }

  const seedData = DEFAULT_SEED_REPOSITORIES.map((repo) => ({
    ...repo,
    userId
  }));

  return await Repository.insertMany(seedData);
};

/**
 * Get all repositories for a user with optional search and language filter
 */
export const getUserRepositories = async (userId, options = {}) => {
  const { search, language, sort = "-updatedAt" } = options;

  const query = { userId };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  if (language && language.toLowerCase() !== "all") {
    query.language = { $regex: new RegExp(`^${language}$`, "i") };
  }

  // Fetch user repositories; genuine empty state returned when count is 0
  return await Repository.find(query).sort(sort);
};


/**
 * Get a single repository by ID or name
 */
export const getRepositoryById = async (userId, identifier) => {
  const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
  const query = isObjectId
    ? { _id: identifier, userId }
    : { name: identifier, userId };

  return await Repository.findOne(query);
};

/**
 * Create a new repository for a user
 */
export const createRepository = async (userId, repoData) => {
  const existing = await Repository.findOne({ userId, name: repoData.name.trim() });
  if (existing) {
    throw new Error(`Repository with name "${repoData.name}" already exists.`);
  }

  const colors = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python: "#3572A5",
    Go: "#00add8",
    Rust: "#dea584",
    Java: "#b07219",
    "C++": "#f34b7d",
    Ruby: "#701516"
  };

  const language = repoData.language || "TypeScript";
  const languageColor = repoData.languageColor || colors[language] || "#38bdf8";

  const repo = await Repository.create({
    ...repoData,
    userId,
    name: repoData.name.trim(),
    language,
    languageColor
  });

  return repo;
};

/**
 * Update an existing repository
 */
export const updateRepository = async (userId, id, updateData) => {
  const safeUpdates = { ...(updateData || {}) };
  delete safeUpdates.userId;
  delete safeUpdates._id;
  delete safeUpdates.owner;
  delete safeUpdates.githubId;
  delete safeUpdates.createdAt;
  delete safeUpdates.updatedAt;

  const repo = await Repository.findOneAndUpdate(
    { _id: id, userId },
    { $set: safeUpdates },
    { new: true, runValidators: true }
  );
  return repo;
};

/**
 * Delete a repository and its persistent vector store embeddings
 */
export const deleteRepository = async (userId, id) => {
  const result = await Repository.findOneAndDelete({ _id: id, userId });
  if (result) {
    try {
      await deleteRepositoryVectors({ repositoryId: id });
    } catch (err) {
      // Non-blocking cleanup logging
    }
  }
  return result;
};

/**
 * Scan and sync repository metrics using truthful data sources (real AST analysis or GitHub API)
 * F-010: Eliminates Math.random() and synthetic metric jitter.
 */
export const syncRepository = async (userId, id) => {
  const repo = await Repository.findOne({ _id: id, userId });
  if (!repo) return null;

  // 1. Check for real analysis data to compute verified code metrics
  const latestAnalysis = await Analysis.findOne({ repositoryId: id, userId }).sort({ createdAt: -1 });

  if (latestAnalysis) {
    if (Number.isFinite(latestAnalysis.totalFiles) && latestAnalysis.totalFiles > 0) {
      repo.filesCount = latestAnalysis.totalFiles;
    }
    // Update primary language from verified analysis if available
    if (latestAnalysis.summary?.primaryLanguage) {
      repo.language = latestAnalysis.summary.primaryLanguage;
    }
    // If analysis produced issues/rules, compute verified code health (or keep existing verified score)
    if (repo.health === null) {
      const issueCount = Array.isArray(latestAnalysis.issues) ? latestAnalysis.issues.length : 0;
      repo.health = Math.max(20, Math.min(100, 100 - issueCount * 5));
      repo.qualityGrade = repo.health >= 90 ? "A" : repo.health >= 80 ? "B" : repo.health >= 70 ? "C" : "D";
      repo.securityStatus = repo.health >= 85 ? "Secure" : repo.health >= 70 ? "Notice" : "Warning";
    }
  } else {
    // Unanalyzed repository: if it has legacy artificial 95/100 score without any analysis, reset to null
    if (repo.health === 95 || repo.health === 100) {
      repo.health = null;
      repo.qualityGrade = null;
    }
  }

  // 2. Truthfully record the scan timestamp without fabricating random jitter
  repo.lastScanned = new Date();
  repo.lastUpdated = new Date();

  await repo.save();
  return repo;
};
