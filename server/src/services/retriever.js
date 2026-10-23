import Analysis from "../models/Analysis.js";
import Repository from "../models/Repository.js";
import { generateEmbedding, batchGenerateEmbeddings } from "./embeddingService.js";
import { getVectorStore } from "./vectorStore/index.js";
import { extractSyntaxChunks } from "./treeSitterParser.js";
import logger from "../utils/logger.js";
import {
  ragRetrievalTotal,
  ragRetrievalDurationSeconds
} from "../metrics/prometheus.js";
import { withSpan } from "../metrics/opentelemetry.js";

// Cache for tracking whether a repository namespace has been seeded during server runtime
const indexedNamespaces = new Set();

/**
 * Creates logical code chunks from a file's content
 */
export function chunkFileContent(filePath, fileName, content, language = "JavaScript") {
  const lines = (content || "").split("\n");
  const chunks = [];
  const CHUNK_SIZE = 45;
  const CHUNK_OVERLAP = 10;

  if (lines.length <= CHUNK_SIZE) {
    chunks.push({
      id: `${filePath}#L1-L${lines.length}`,
      filePath,
      fileName,
      language,
      startLine: 1,
      endLine: lines.length,
      content: (content || "").trim()
    });
    return chunks;
  }

  for (let i = 0; i < lines.length; i += (CHUNK_SIZE - CHUNK_OVERLAP)) {
    const chunkLines = lines.slice(i, i + CHUNK_SIZE);
    const startLine = i + 1;
    const endLine = i + chunkLines.length;

    chunks.push({
      id: `${filePath}#L${startLine}-L${endLine}`,
      filePath,
      fileName,
      language,
      startLine,
      endLine,
      content: chunkLines.join("\n").trim()
    });

    if (endLine >= lines.length) break;
  }

  return chunks;
}

/**
 * Generates foundational codebase chunks for a repository based on analysis and models
 */
/**
 * Generates codebase chunks for a repository based on authentic analysis AST models and file structures.
 * Never includes nonexistent files (such as paymentService.js) or fabricated source code.
 */
export function buildRepositoryKnowledgeChunks(repo, analysis) {
  const chunks = [];
  const repoName = repo?.name || "repository";
  const repoBranch = repo?.activeBranch || "main";

  // If analysis includes actual files, construct genuine source chunks
  if (analysis?.files && Array.isArray(analysis.files) && analysis.files.length > 0) {
    analysis.files.forEach((file, idx) => {
      if (!file.path || !file.name) return;
      const fileLines = file.lines || 1;
      chunks.push({
        id: `chunk-repo-file-${idx}-${file.name}`,
        filePath: file.path,
        fileName: file.name,
        language: file.language || file.extension || "Text",
        startLine: 1,
        endLine: fileLines,
        content: `// Repository: ${repoName} | Path: ${file.path}\n// Module: ${file.module || "core"} | Lines: ${fileLines}\n${file.summary || `File entry in ${file.path}`}`
      });
    });
  } else if (repo?.fileTree && Array.isArray(repo.fileTree) && repo.fileTree.length > 0) {
    // If analysis is not yet run, but repository has an imported fileTree, ground chunks in real tree
    repo.fileTree.forEach((fileItem, idx) => {
      chunks.push({
        id: `chunk-tree-file-${idx}-${fileItem.name}`,
        filePath: fileItem.name,
        fileName: fileItem.name,
        language: repo.language || "Text",
        startLine: 1,
        endLine: 1,
        content: `// Repository: ${repoName} | File: ${fileItem.name} (${fileItem.size || "1.0 KB"})\n// Commit: ${fileItem.commit || "Initial commit"}`
      });
    });
  }

  return chunks;
}


/**
 * Ensures the repository's vector store is initialized with chunk embeddings
 * @param {string|Object} repositoryId - Target repository ID
 * @param {string} [branch="main"] - Target repository branch
 * @param {boolean} [forceReindex=false] - Force re-indexing of vectors
 */
export async function ensureRepositoryIndexed(repositoryId, branch = "main", forceReindex = false) {
  const repoIdStr = repositoryId.toString();
  const namespaceKey = `${repoIdStr}:${branch || "main"}`;

  if (!forceReindex && indexedNamespaces.has(namespaceKey)) {
    return true;
  }

  const vectorStore = await getVectorStore();

  // If reindex requested, delete existing repository namespace first
  if (forceReindex) {
    await vectorStore.deleteNamespace({ repositoryId: repoIdStr, branch });
    indexedNamespaces.delete(namespaceKey);
  }

  // Load repository and analysis metadata from MongoDB if available
  const [repo, analysis] = await Promise.all([
    Repository.findById(repositoryId).catch(() => null),
    Analysis.findOne({ repositoryId }).sort({ createdAt: -1 }).catch(() => null)
  ]);

  const activeBranch = branch || repo?.activeBranch || "main";
  const rawChunks = buildRepositoryKnowledgeChunks(repo || { name: "Codebase", activeBranch }, analysis);

  // Generate embeddings and enrich chunks
  const chunksToUpsert = await Promise.all(
    rawChunks.map(async (chunk) => {
      const embeddingText = `${chunk.filePath} ${chunk.fileName} ${chunk.content}`;
      const embedding = await generateEmbedding(embeddingText);
      return {
        ...chunk,
        repositoryId: repoIdStr,
        branch: activeBranch,
        embedding,
        metadata: {
          indexedAt: new Date().toISOString(),
          repoName: repo?.name || "Codebase"
        }
      };
    })
  );

  // Batch upsert to vector store
  const { inserted } = await vectorStore.upsert(chunksToUpsert);
  indexedNamespaces.add(namespaceKey);
  logger.info(`[Retriever] Successfully indexed ${inserted} chunks for repository '${repoIdStr}' (branch: ${activeBranch}) via ${vectorStore.getName()} vector store.`);
  return true;
}

/**
 * Indexes arbitrary file documents into the repository vector store
 * Supports full repository scans and incremental updates
 */
export async function indexRepositoryFiles({ repositoryId, branch = "main", files = [] }) {
  if (!repositoryId || !Array.isArray(files) || files.length === 0) {
    return { indexed: 0 };
  }

  const vectorStore = await getVectorStore();
  const repoIdStr = repositoryId.toString();
  const chunks = [];

  for (const file of files) {
    const filePath = file.path || file.filePath;
    const fileName = file.name || file.fileName;
    const content = file.content || "";
    const language = file.language || "JavaScript";

    let fileChunks = [];
    try {
      fileChunks = await extractSyntaxChunks(filePath, fileName, content, language);
    } catch (_) {
      fileChunks = chunkFileContent(filePath, fileName, content, language);
    }

    for (const fc of fileChunks) {
      const embeddingText = `${fc.filePath} ${fc.fileName} ${fc.symbolName || ""} ${fc.content}`;
      const embedding = await generateEmbedding(embeddingText);
      chunks.push({
        ...fc,
        repositoryId: repoIdStr,
        branch,
        embedding,
        metadata: {
          fileSize: file.size,
          lastModified: file.lastModified,
          symbolType: fc.symbolType || "block",
          symbolName: fc.symbolName || null
        }
      });
    }
  }

  const { inserted } = await vectorStore.upsert(chunks);
  indexedNamespaces.add(`${repoIdStr}:${branch}`);
  return { indexed: inserted };
}

/**
 * Deletes vector embeddings for a repository (and optional branch)
 */
export async function deleteRepositoryVectors({ repositoryId, branch }) {
  const vectorStore = await getVectorStore();
  const repoIdStr = repositoryId.toString();
  const result = await vectorStore.deleteNamespace({ repositoryId: repoIdStr, branch });
  if (branch) {
    indexedNamespaces.delete(`${repoIdStr}:${branch}`);
  } else {
    for (const key of Array.from(indexedNamespaces)) {
      if (key.startsWith(`${repoIdStr}:`)) {
        indexedNamespaces.delete(key);
      }
    }
  }
  return result;
}

/**
 * Retrieves top-K relevant code chunks for a user query using vector similarity search
 * Enforces strict repository isolation
 */
export async function retrieveRelevantChunks({ repositoryId, branch = "main", query, topK = 4 }) {
  if (!query || typeof query !== "string" || !repositoryId) {
    return { chunks: [], contextString: "", sourceReferences: [] };
  }

  const startTime = Date.now();
  let status = "success";
  let backend = "memory";

  return await withSpan("rag.retrieve_chunks", async (span) => {
    try {
      const repoIdStr = repositoryId.toString();

      // 1. Ensure repository is indexed
      await ensureRepositoryIndexed(repoIdStr, branch);

      // 2. Generate embedding for user query
      const queryEmbedding = await generateEmbedding(query);

      // 3. Search via vector store
      const vectorStore = await getVectorStore();
      backend = vectorStore.getName ? vectorStore.getName() : "vector_store";
      span?.setAttribute("rag.backend", backend);
      span?.setAttribute("rag.top_k", topK);

      const scoredChunks = await vectorStore.search({
        repositoryId: repoIdStr,
        branch,
        queryEmbedding,
        queryText: query,
        topK
      });

      const durationMs = Date.now() - startTime;
      logger.debug(`[Retriever] Retrieved ${scoredChunks.length} chunks for query in ${durationMs}ms via ${backend} vector store.`);

      // 4. Assemble formatted context and citations
      let contextString = "";
      const sourceReferences = [];

      scoredChunks.forEach(({ id, filePath, fileName, startLine, endLine, content, score, relevanceScore }, idx) => {
        contextString += `\n--- SOURCE FILE #${idx + 1}: ${filePath} (Lines ${startLine}-${endLine}) ---\n`;
        contextString += `${content}\n`;

        sourceReferences.push({
          id,
          fileName,
          filePath,
          lineRange: `${startLine}-${endLine}`,
          snippet: (content || "").slice(0, 350),
          relevanceScore: relevanceScore || Math.round((score || 0) * 100)
        });
      });

      return {
        chunks: scoredChunks,
        contextString: contextString.trim(),
        sourceReferences
      };
    } catch (err) {
      status = "error";
      throw err;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      ragRetrievalTotal.inc({ backend, status });
      ragRetrievalDurationSeconds.observe({ backend }, duration);
    }
  });
}

export default {
  chunkFileContent,
  buildRepositoryKnowledgeChunks,
  ensureRepositoryIndexed,
  indexRepositoryFiles,
  deleteRepositoryVectors,
  retrieveRelevantChunks
};
