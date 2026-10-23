import axios from "axios";
import Analysis from "../models/Analysis.js";

const GITHUB_API_BASE = "https://api.github.com";
const LINE_COUNT_CONCURRENCY = 16;
const MAX_LINE_COUNT_FILE_SIZE = 20 * 1024 * 1024;
const SOURCE_CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rs", "java",
  "cpp", "cc", "c", "h", "hpp", "cs", "rb", "php", "swift", "kt",
  "css", "scss", "sass", "sql", "sh", "bash"
]);

// Directories and patterns to ignore
const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  "tmp",
  "temp",
  ".vscode",
  ".idea",
  "vendor",
  "target",
  "__pycache__",
  ".turbo",
  ".cache"
]);

// Binary, lock, and generated extensions to filter out
const IGNORED_EXTENSIONS = new Set([
  // Binary / Media
  "png", "jpg", "jpeg", "gif", "ico", "svg", "webp", "pdf",
  "zip", "tar", "gz", "7z", "rar", "wasm", "exe", "dll",
  "so", "dylib", "bin", "woff", "woff2", "ttf", "eot",
  "mp3", "mp4", "mov", "avi", "iso", "dmg", "jar",
  // Lock files & Maps
  "lock", "map"
]);

const IGNORED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "poetry.lock",
  "composer.lock",
  ".DS_Store",
  "Thumbs.db"
]);

// Language extension mapping
const EXTENSION_LANGUAGE_MAP = {
  ts: { name: "TypeScript", color: "#3178c6" },
  tsx: { name: "TypeScript", color: "#3178c6" },
  js: { name: "JavaScript", color: "#f7df1e" },
  jsx: { name: "JavaScript", color: "#f7df1e" },
  mjs: { name: "JavaScript", color: "#f7df1e" },
  cjs: { name: "JavaScript", color: "#f7df1e" },
  py: { name: "Python", color: "#3572A5" },
  go: { name: "Go", color: "#00add8" },
  rs: { name: "Rust", color: "#dea584" },
  java: { name: "Java", color: "#b07219" },
  cpp: { name: "C++", color: "#f34b7d" },
  cc: { name: "C++", color: "#f34b7d" },
  c: { name: "C", color: "#555555" },
  h: { name: "C/C++ Header", color: "#555555" },
  hpp: { name: "C++ Header", color: "#f34b7d" },
  cs: { name: "C#", color: "#178600" },
  rb: { name: "Ruby", color: "#701516" },
  php: { name: "PHP", color: "#4F5D95" },
  swift: { name: "Swift", color: "#F05138" },
  kt: { name: "Kotlin", color: "#A97BFF" },
  html: { name: "HTML", color: "#e34c26" },
  css: { name: "CSS", color: "#563d7c" },
  scss: { name: "SCSS", color: "#c6538c" },
  sass: { name: "Sass", color: "#a53b70" },
  json: { name: "JSON", color: "#292929" },
  md: { name: "Markdown", color: "#083fa1" },
  yaml: { name: "YAML", color: "#cb171e" },
  yml: { name: "YAML", color: "#cb171e" },
  sql: { name: "SQL", color: "#e38c00" },
  sh: { name: "Shell", color: "#89e051" },
  bash: { name: "Shell", color: "#89e051" }
};

/**
 * Filter irrelevant files based on patterns, extensions, and directory rules
 */
export const shouldIgnorePath = (filePath) => {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  const fileName = segments[segments.length - 1];

  // 1. Check ignored directory segments
  for (const part of segments.slice(0, -1)) {
    if (IGNORED_DIRECTORIES.has(part) || part.startsWith(".")) {
      if (part !== ".github" && part !== ".config") {
        return true;
      }
    }
  }

  // 2. Check ignored filenames
  if (IGNORED_FILENAMES.has(fileName)) {
    return true;
  }

  // 3. Minified files
  if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css") || fileName.endsWith(".bundle.js")) {
    return true;
  }

  // 4. Ignored extensions
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = fileName.substring(dotIndex + 1).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) {
      return true;
    }
  }

  return false;
};

/**
 * Detect language from file path
 */
export const detectLanguage = (filePath) => {
  const fileName = filePath.split("/").pop();
  if (fileName.toLowerCase() === "dockerfile") {
    return { name: "Dockerfile", color: "#384d54" };
  }

  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = fileName.substring(dotIndex + 1).toLowerCase();
    if (EXTENSION_LANGUAGE_MAP[ext]) {
      return EXTENSION_LANGUAGE_MAP[ext];
    }
  }

  return { name: "Plain Text", color: "#8b949e" };
};

/**
 * Detect if a file is an application entry point
 */
export const detectEntryPoint = (filePath) => {
  const normalized = filePath.toLowerCase();
  const fileName = normalized.split("/").pop();

  if (
    fileName === "main.ts" ||
    fileName === "main.js" ||
    fileName === "main.tsx" ||
    fileName === "main.jsx" ||
    fileName === "app.tsx" ||
    fileName === "app.jsx" ||
    fileName === "index.html"
  ) {
    return { isEntry: true, type: "client" };
  }

  if (
    fileName === "server.js" ||
    fileName === "server.ts" ||
    fileName === "app.js" ||
    fileName === "app.ts" ||
    fileName === "main.go" ||
    fileName === "main.rs" ||
    fileName === "app.py" ||
    fileName === "main.py" ||
    fileName === "wsgi.py"
  ) {
    return { isEntry: true, type: "server" };
  }

  if (fileName === "cli.js" || fileName === "cli.ts" || fileName === "bin.js") {
    return { isEntry: true, type: "cli" };
  }

  return { isEntry: false, type: null };
};

/**
 * Extract architectural module grouping from file path
 */
export const detectModule = (filePath) => {
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts.length > 1) {
    // E.g., client/src/... -> "client"
    // server/src/... -> "server"
    // src/controllers/... -> "controllers"
    if (parts[0] === "src" && parts.length > 2) {
      return parts[1];
    }
    return parts[0];
  }
  return "root";
};

/**
 * Fetch files from remote GitHub repository tree
 */
export const fetchRemoteGithubFiles = async (owner, repoName, branch = "main", accessToken = null) => {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Devra-Developer-Platform",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (accessToken && (accessToken.startsWith("gh") || accessToken.startsWith("github_pat_"))) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers, timeout: 8000 }
    );

    if (response.data?.tree) {
      return response.data.tree
        .filter((item) => item.type === "blob")
        .map((item) => ({
          path: item.path,
          size: item.size || 0,
          sha: item.sha
        }));
    }
  } catch (error) {
    // GitHub returns 409 when an empty repository has no commit/tree yet.
    if (error.response?.status === 409) return [];
    const status = error.response?.status;
    const message = status === 404
      ? `Could not find branch "${branch}" in ${owner}/${repoName}. Sync the repository and try again.`
      : status === 401 || status === 403
        ? "GitHub did not allow access to this repository. Reconnect GitHub and try again."
        : `Could not load files from GitHub${status ? ` (HTTP ${status})` : ""}. Check the connection and try again.`;
    const fetchError = new Error(message);
    fetchError.status = status || 502;
    throw fetchError;
  }

  return [];
};

const countNonBlankLines = (content) => content
  .replace(/^\uFEFF/, "")
  .split(/\r\n|\n|\r/)
  .filter((line) => line.trim().length > 0).length;

const fetchGithubLineCounts = async ({ owner, repoName, files, accessToken }) => {
  const sourceFiles = files.filter((file) => SOURCE_CODE_EXTENSIONS.has(
    file.path.split("/").pop().split(".").pop().toLowerCase()
  ));
  const eligibleFiles = sourceFiles.filter((file) => file.size <= MAX_LINE_COUNT_FILE_SIZE);
  const lineCounts = new Map();
  const blobLineCounts = new Map();
  const uniqueBlobs = [...new Map(eligibleFiles.filter((file) => file.sha).map((file) => [file.sha, file])).values()];
  const hasGithubToken = accessToken && (accessToken.startsWith("gh") || accessToken.startsWith("github_pat_"));
  // Anonymous repositories are counted in the browser from raw.githubusercontent.com
  // to avoid spending the user's unauthenticated REST API quota on one request per blob.
  if (!hasGithubToken) {
    return { lineCounts, complete: sourceFiles.length === 0 };
  }
  const blobsToFetch = uniqueBlobs;
  let nextIndex = 0;
  let complete = eligibleFiles.length === sourceFiles.length
    && eligibleFiles.every((file) => Boolean(file.sha));
  let rateLimited = false;

  const workers = Array.from({ length: Math.min(LINE_COUNT_CONCURRENCY, blobsToFetch.length) }, async () => {
    while (nextIndex < blobsToFetch.length && !rateLimited) {
      const file = blobsToFetch[nextIndex++];
      const headers = {
        Accept: "application/vnd.github+json",
        "User-Agent": "Devra-Developer-Platform",
        "X-GitHub-Api-Version": "2022-11-28"
      };
      if (hasGithubToken) headers.Authorization = `Bearer ${accessToken}`;
      try {
        const response = await axios.get(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/blobs/${file.sha}`,
          { headers, timeout: 8000 }
        );
        if (response.data?.encoding !== "base64" || typeof response.data.content !== "string") {
          complete = false;
          continue;
        }
        blobLineCounts.set(file.sha, countNonBlankLines(Buffer.from(response.data.content, "base64").toString("utf8")));
      } catch (error) {
        complete = false;
        if (error.response?.status === 403 && /rate limit/i.test(error.response?.data?.message || "")) {
          rateLimited = true;
        }
      }
    }
  });

  await Promise.all(workers);
  for (const file of eligibleFiles) {
    if (blobLineCounts.has(file.sha)) lineCounts.set(file.path, blobLineCounts.get(file.sha));
    else complete = false;
  }
  return { lineCounts, complete };
};

/**
 * Standard manifest dependencies extraction
 */
export const extractDependencies = (repo) => {
  return [];
};

/**
 * Main Codebase Analysis Pipeline:
 * Fetch files -> Filter -> Detect languages -> Analyze directories -> Detect modules -> Detect dependencies/relationships -> Store
 */
export const runCodebaseAnalysis = async (repository, user, options = {}) => {
  // Step 1: Fetch raw files
  let rawFiles;
  if (repository.owner?.login && repository.name) {
    rawFiles = await fetchRemoteGithubFiles(
      repository.owner.login,
      repository.name,
      repository.defaultBranch || "main",
      user?.githubAccessToken
    );
  } else {
    rawFiles = (repository.fileTree || []).map((item) => ({
      path: item.path || item.name,
      size: item.size || 0
    })).filter((item) => item.path);
  }

  // Step 2: Filter irrelevant files
  const validFiles = rawFiles.filter((f) => !shouldIgnorePath(f.path));
  const githubLineCounts = repository.owner?.login
    ? await fetchGithubLineCounts({
        owner: repository.owner.login,
        repoName: repository.name,
        files: validFiles,
        accessToken: user?.githubAccessToken
      })
    : { lineCounts: new Map(), complete: false };

  // Step 3 & 4: Process files, detect languages, entry points, and directory topology
  const fileAnalyses = [];
  const dirMap = new Map();
  const langMap = new Map();
  const entryPoints = [];
  const moduleMap = new Map();

  let totalLines = 0;
  let sourceLinesComplete = githubLineCounts.complete || !repository.owner?.login;
  let totalBytes = 0;

  for (const item of validFiles) {
    const p = item.path.replace(/\\/g, "/");
    const parts = p.split("/");
    const name = parts[parts.length - 1];
    const dotIndex = name.lastIndexOf(".");
    const ext = dotIndex !== -1 ? name.substring(dotIndex + 1).toLowerCase() : "";

    const langInfo = detectLanguage(p);
    const entryInfo = detectEntryPoint(p);
    const modName = detectModule(p);

    const size = item.size || 0;
    const lines = githubLineCounts.lineCounts.get(p) ?? item.lines ?? null;
    if (lines === null) sourceLinesComplete = false;

    const isSourceCode = SOURCE_CODE_EXTENSIONS.has(ext);
    if (isSourceCode && lines !== null) totalLines += lines;
    totalBytes += size;

    if (entryInfo.isEntry) {
      entryPoints.push({
        path: p,
        language: langInfo.name,
        type: entryInfo.type
      });
    }

    // Accumulate language stats
    const langStat = langMap.get(langInfo.name) || {
      name: langInfo.name,
      fileCount: 0,
      lines: 0,
      bytes: 0,
      color: langInfo.color
    };
    langStat.fileCount += 1;
    langStat.lines += lines || 0;
    langStat.bytes += size;
    langMap.set(langInfo.name, langStat);

    // Track module stats
    const modStat = moduleMap.get(modName) || {
      name: modName,
      path: modName === "root" ? "/" : `${modName}/`,
      fileCount: 0,
      primaryLanguage: langInfo.name,
      description: `Architectural module for ${modName}`
    };
    modStat.fileCount += 1;
    moduleMap.set(modName, modStat);

    // Track directory hierarchy
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join("/");
        const dirName = parts[i - 1];
        const curDir = dirMap.get(dirPath) || {
          path: dirPath,
          name: dirName,
          depth: i,
          fileCount: 0
        };
        curDir.fileCount += 1;
        dirMap.set(dirPath, curDir);
      }
    }

    fileAnalyses.push({
      path: p,
      name,
      extension: ext,
      language: langInfo.name,
      size,
      lines: lines ?? 0,
      isEntryPoint: entryInfo.isEntry,
      module: modName
    });
  }

  // Format language percentages
  const languages = Array.from(langMap.values()).map((lang) => ({
    ...lang,
    percentage: totalBytes > 0 ? parseFloat(((lang.bytes / totalBytes) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.bytes - a.bytes);

  // Step 5: Detect package dependencies
  const dependencies = [];

  // Step 6: Detect architectural relationships
  const relationships = [];

  // Primary language
  const primaryLanguage = languages[0]?.name || null;

  // Step 7: Store in MongoDB
  const analysis = await Analysis.create({
    repositoryId: repository._id,
    userId: user._id,
    totalFiles: fileAnalyses.length,
      totalLines: sourceLinesComplete ? totalLines : null,
    totalDirectories: dirMap.size,
    files: fileAnalyses,
    directories: Array.from(dirMap.values()).sort((a, b) => a.depth - b.depth),
    languages,
    dependencies,
    modules: Array.from(moduleMap.values()),
    entryPoints,
    relationships,
    summary: {
      source: repository.owner?.login ? "github-tree-v4" : "stored-file-tree-v4",
      lineCountComplete: sourceLinesComplete,
      repositoryFileCount: rawFiles.length,
      primaryLanguage,
      architecturePattern: primaryLanguage ? `${primaryLanguage} Modular Architecture` : null,
      status: fileAnalyses.length ? "complete" : "empty"
    },
    generatedAt: new Date()
  });

  return analysis;
};

/**
 * Get latest analysis for repository
 */
export const getLatestAnalysis = async (repositoryId, userId) => {
  return await Analysis.findOne({ repositoryId, userId }).sort({ createdAt: -1 });
};
