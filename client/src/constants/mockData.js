/**
 * Mock Data for Devra Developer Platform
 */

export const MOCK_USER = {
  name: "Alex Vance",
  email: "alex@devra.ai",
  role: "Lead Systems Architect",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
  plan: "Enterprise Pro",
  organization: "Starlight Engineering"
};

export const MOCK_METRICS = {
  repositoryCount: 14,
  repositoryTrend: "+2 this month",
  codeQuality: 94.8,
  codeQualityGrade: "A+",
  codeQualityTrend: "+3.2% vs last release",
  securityScore: 98,
  securityVulnerabilities: { critical: 0, high: 0, medium: 2, low: 5 },
  securityTrend: "Zero CVEs in last 45 days",
  openIssues: 24,
  issuesBreakdown: { bugs: 6, refactors: 11, security: 1, performance: 6 },
  testCoverage: 88.4,
  documentationCoverage: 91.2
};

export const MOCK_REPOSITORIES = [
  {
    id: "repo-1",
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
    lastScanned: "12m ago",
    activeBranch: "main",
    branchCount: 8,
    commitCount: 1420,
    testCoverage: 92.5,
    contributors: 14,
    filesCount: 184
  },
  {
    id: "repo-2",
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
    lastScanned: "34m ago",
    activeBranch: "main",
    branchCount: 5,
    commitCount: 890,
    testCoverage: 95.1,
    contributors: 8,
    filesCount: 68
  },
  {
    id: "repo-3",
    name: "vision-spatial-engine",
    description: "Three.js and WebGL buffer manager for 3D codebase topology rendering.",
    language: "JavaScript",
    languageColor: "#f7df1e",
    stars: 520,
    forks: 41,
    health: 89,
    qualityGrade: "B+",
    securityStatus: "Review Needed",
    openIssues: 9,
    lastScanned: "2h ago",
    activeBranch: "v2.0-dev",
    branchCount: 12,
    commitCount: 630,
    testCoverage: 81.0,
    contributors: 6,
    filesCount: 92
  },
  {
    id: "repo-4",
    name: "devra-vscode",
    description: "VS Code extension providing inline AI code reviews, refactoring, and conversational chat.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 1980,
    forks: 310,
    health: 93,
    qualityGrade: "A",
    securityStatus: "Secure",
    openIssues: 5,
    lastScanned: "4h ago",
    activeBranch: "main",
    branchCount: 6,
    commitCount: 450,
    testCoverage: 89.7,
    contributors: 11,
    filesCount: 54
  },
  {
    id: "repo-5",
    name: "ml-embed-service",
    description: "Python microservice serving code embeddings and AST vector search.",
    language: "Python",
    languageColor: "#3572a5",
    stars: 430,
    forks: 38,
    health: 91,
    qualityGrade: "A-",
    securityStatus: "Secure",
    openIssues: 4,
    lastScanned: "Yesterday",
    activeBranch: "main",
    branchCount: 4,
    commitCount: 320,
    testCoverage: 87.2,
    contributors: 5,
    filesCount: 42
  }
];

export const MOCK_REVIEWS = [
  {
    id: "rev-101",
    prNumber: 148,
    title: "Optimize AST traversal cache and prevent memory leak in worker threads",
    repoName: "devra-core",
    author: {
      name: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces"
    },
    status: "passed",
    riskLevel: "Low",
    score: 96,
    findingsCount: 1,
    criticalCount: 0,
    timestamp: "18m ago",
    branch: "feat/ast-cache-v2",
    filesChanged: 4,
    additions: 142,
    deletions: 38,
    diffSnippet: {
      fileName: "src/parser/astWorker.ts",
      oldCode: `// Deprecated: Unbounded cache causes memory pressure\nconst globalNodeCache = new Map();\n\nexport function traverseAst(root: AstNode): void {\n  globalNodeCache.set(root.id, root);\n  // No cleanup listener\n}`,
      newCode: `// Fixed: LRU eviction cache with thread lifetime bindings\nconst nodeCache = new LRUCache<string, AstNode>({ max: 5000 });\n\nexport function traverseAst(root: AstNode): void {\n  nodeCache.set(root.id, root);\n  process.once('beforeExit', () => nodeCache.clear());\n}`,
      aiComment: "Well done! The LRU constraint prevents unmanaged node retention during continuous repository indexing."
    }
  },
  {
    id: "rev-102",
    prNumber: 145,
    title: "Implement sliding window rate limiting on public webhook endpoints",
    repoName: "api-gateway",
    author: {
      name: "Alex Kumar",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces"
    },
    status: "needs_attention",
    riskLevel: "Medium",
    score: 82,
    findingsCount: 3,
    criticalCount: 0,
    timestamp: "1h ago",
    branch: "sec/rate-limit-window",
    filesChanged: 6,
    additions: 210,
    deletions: 45,
    diffSnippet: {
      fileName: "pkg/middleware/ratelimit.go",
      oldCode: `func CheckLimit(clientIP string) bool {\n    count := redisClient.Get(clientIP)\n    return count < 100\n}`,
      newCode: `func CheckLimit(clientIP string) (bool, error) {\n    // Potential race condition between GET and INCR\n    val, _ := redisClient.Incr(clientIP).Result()\n    if val == 1 {\n        redisClient.Expire(clientIP, time.Minute)\n    }\n    return val <= 100, nil\n}`,
      aiComment: "Potential TTL leak: If `redisClient.Expire` fails due to network partition right after `Incr`, key will never expire. Use Redis MULTI/EXEC or Lua atomic script."
    }
  },
  {
    id: "rev-103",
    prNumber: 142,
    title: "Batch WebGL buffer streaming for 3D dependency graph view",
    repoName: "vision-spatial-engine",
    author: {
      name: "Siddharth O.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces"
    },
    status: "passed",
    riskLevel: "Low",
    score: 94,
    findingsCount: 2,
    criticalCount: 0,
    timestamp: "3h ago",
    branch: "perf/instanced-mesh",
    filesChanged: 8,
    additions: 380,
    deletions: 190,
    diffSnippet: {
      fileName: "src/renderers/NodeGraph.jsx",
      oldCode: `nodes.map(node => <mesh key={node.id} position={node.pos} />)`,
      newCode: `<instancedMesh ref={meshRef} args={[geometry, material, nodes.length]} />`,
      aiComment: "Excellent optimization: Consolidated individual draw calls into single instanced mesh. Draw calls drop from 1,200 to 1."
    }
  },
  {
    id: "rev-104",
    prNumber: 139,
    title: "Add GitHub pull request event listener for automatic review dispatch",
    repoName: "devra-core",
    author: {
      name: "Elena Rostova",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=faces"
    },
    status: "passed",
    riskLevel: "Low",
    score: 98,
    findingsCount: 0,
    criticalCount: 0,
    timestamp: "Yesterday",
    branch: "feat/webhook-dispatch",
    filesChanged: 3,
    additions: 95,
    deletions: 12,
    diffSnippet: null
  }
];

export const MOCK_ACTIVITY = [
  {
    id: "act-1",
    type: "review",
    title: "AI Review Completed",
    description: "PR #148 in devra-core passed all 12 code quality & security rules.",
    timestamp: "18m ago",
    user: "Devra AI Engine",
    badge: "Passed",
    badgeColor: "emerald"
  },
  {
    id: "act-2",
    type: "scan",
    title: "Repository Static Scan",
    description: "Completed full AST indexing on api-gateway (68 files, 14k LOC).",
    timestamp: "34m ago",
    user: "System Runner",
    badge: "Completed",
    badgeColor: "cyan"
  },
  {
    id: "act-3",
    type: "security",
    title: "Security Finding Resolved",
    description: "Sarah Chen patched unvalidated regex in route parser.",
    timestamp: "2h ago",
    user: "Sarah Chen",
    badge: "Resolved",
    badgeColor: "blue"
  },
  {
    id: "act-4",
    type: "extension",
    title: "VS Code Session Paired",
    description: "Alex Kumar connected VS Code extension workspace to devra-core.",
    timestamp: "4h ago",
    user: "Alex Kumar",
    badge: "Active",
    badgeColor: "purple"
  },
  {
    id: "act-5",
    type: "test",
    title: "Automated Tests Generated",
    description: "Devra synthesized 18 integration tests with 94% branch coverage.",
    timestamp: "6h ago",
    user: "Devra AI Engine",
    badge: "Generated",
    badgeColor: "emerald"
  }
];

export const MOCK_CHAT_THREADS = [
  {
    id: "thread-1",
    title: "AST Caching & Worker Optimization",
    repo: "devra-core",
    date: "Today"
  },
  {
    id: "thread-2",
    title: "Debugging Redis Rate Limiter Lock",
    repo: "api-gateway",
    date: "Yesterday"
  },
  {
    id: "thread-3",
    title: "InstancedMesh Memory Footprint in Three.js",
    repo: "vision-spatial-engine",
    date: "3 days ago"
  }
];

export const MOCK_CHAT_MESSAGES = [
  {
    id: "msg-1",
    sender: "user",
    text: "Can you review how our AST worker handles parser errors when processing non-standard JSX syntax?",
    timestamp: "10:24 AM"
  },
  {
    id: "msg-2",
    sender: "assistant",
    text: `I inspected \`src/parser/astWorker.ts\` and \`src/services/codeAnalysisService.js\`. Here is what happens:

1. **Parser Graceful Degradation**: When a syntax error occurs in a JSX file, the worker catches \`SyntaxError\` and logs a non-fatal warning instead of halting the queue.
2. **Partial AST Extraction**: It falls back to resilient regex-based token matching for imports and exported identifiers so module dependency graphs remain intact.
3. **Recommendation**: We should add an explicit error badge to the repository dashboard when fallback mode is engaged.`,
    codeSnippet: `// Suggested enhancement for astWorker.ts\ntry {\n  return parser.parse(sourceCode, {\n    sourceType: 'module',\n    plugins: ['jsx', 'typescript', 'decorators-legacy']\n  });\n} catch (err) {\n  telemetry.recordParseFailure(filePath, err.message);\n  return fallbackPartialExtract(sourceCode);\n}`,
    language: "typescript",
    timestamp: "10:25 AM"
  }
];
