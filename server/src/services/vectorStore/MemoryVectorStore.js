import VectorStore from "./VectorStore.js";
import { cosineSimilarity } from "../embeddingService.js";
import logger from "../../utils/logger.js";

/**
 * In-Memory Vector Store implementation
 * Used as default fallback and for isolated testing environments.
 */
export class MemoryVectorStore extends VectorStore {
  constructor() {
    super();
    // Map<namespace, Array<Chunk>> where namespace is `${repositoryId}:${branch}`
    this.storage = new Map();
  }

  getName() {
    return "memory";
  }

  async initialize() {
    logger.info("[MemoryVectorStore] In-memory vector store initialized.");
    return true;
  }

  _getNamespaceKey(repositoryId, branch = "main") {
    return `${String(repositoryId)}:${branch || "main"}`;
  }

  async upsert(chunks = []) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return { inserted: 0, failed: 0 };
    }

    let inserted = 0;
    let failed = 0;

    for (const chunk of chunks) {
      try {
        if (!chunk.repositoryId || !chunk.id || !chunk.embedding) {
          failed++;
          continue;
        }

        const namespace = this._getNamespaceKey(chunk.repositoryId, chunk.branch);
        if (!this.storage.has(namespace)) {
          this.storage.set(namespace, []);
        }

        const list = this.storage.get(namespace);
        const existingIdx = list.findIndex((c) => c.id === chunk.id);

        const normalizedChunk = {
          id: chunk.id,
          repositoryId: String(chunk.repositoryId),
          branch: chunk.branch || "main",
          filePath: chunk.filePath || "",
          fileName: chunk.fileName || "",
          language: chunk.language || "JavaScript",
          startLine: Number(chunk.startLine) || 1,
          endLine: Number(chunk.endLine) || 1,
          content: chunk.content || "",
          embedding: Array.from(chunk.embedding),
          metadata: chunk.metadata || {}
        };

        if (existingIdx >= 0) {
          // Deterministic replacement
          list[existingIdx] = normalizedChunk;
        } else {
          list.push(normalizedChunk);
        }

        inserted++;
      } catch (err) {
        failed++;
      }
    }

    return { inserted, failed };
  }

  async search({ repositoryId, branch, queryEmbedding, queryText = "", topK = 4 }) {
    if (!repositoryId || !queryEmbedding || !Array.isArray(queryEmbedding)) {
      return [];
    }

    const repoIdStr = String(repositoryId);
    let targetChunks = [];

    if (branch) {
      const namespace = this._getNamespaceKey(repoIdStr, branch);
      targetChunks = this.storage.get(namespace) || [];
    } else {
      // Search all branches for this repository (strict repository isolation)
      for (const [key, chunks] of this.storage.entries()) {
        if (key.startsWith(`${repoIdStr}:`)) {
          targetChunks.push(...chunks);
        }
      }
    }

    if (targetChunks.length === 0) {
      return [];
    }

    const lowerQuery = (queryText || "").toLowerCase();

    // Score all chunks in the repository
    const scored = targetChunks.map((chunk) => {
      let similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

      // Apply keyword boost
      if (lowerQuery) {
        const lowerPath = (chunk.filePath || "").toLowerCase();
        if (lowerQuery.includes("auth") && lowerPath.includes("auth")) similarity += 0.35;
        if (lowerQuery.includes("payment") && lowerPath.includes("payment")) similarity += 0.35;
        if (
          (lowerQuery.includes("database") || lowerQuery.includes("db") || lowerQuery.includes("model")) &&
          (lowerPath.includes("model") || lowerPath.includes("schema") || lowerPath.includes("user"))
        ) {
          similarity += 0.35;
        }
        if (
          (lowerQuery.includes("endpoint") || lowerQuery.includes("route") || lowerQuery.includes("flow")) &&
          (lowerPath.includes("route") || lowerPath.includes("app.js") || lowerPath.includes("controller"))
        ) {
          similarity += 0.30;
        }
      }

      const score = Math.min(1.0, Math.max(0, similarity));

      return {
        id: chunk.id,
        repositoryId: chunk.repositoryId,
        branch: chunk.branch,
        filePath: chunk.filePath,
        fileName: chunk.fileName,
        language: chunk.language,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content,
        metadata: chunk.metadata,
        score,
        relevanceScore: Math.round(score * 100)
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async delete({ repositoryId, branch, chunkIds = [] }) {
    if (!repositoryId || !Array.isArray(chunkIds) || chunkIds.length === 0) {
      return { deleted: 0 };
    }

    const repoIdStr = String(repositoryId);
    let totalDeleted = 0;
    const chunkIdSet = new Set(chunkIds);

    for (const [key, chunks] of this.storage.entries()) {
      if (branch ? key === this._getNamespaceKey(repoIdStr, branch) : key.startsWith(`${repoIdStr}:`)) {
        const remaining = chunks.filter((c) => !chunkIdSet.has(c.id));
        totalDeleted += chunks.length - remaining.length;
        this.storage.set(key, remaining);
      }
    }

    return { deleted: totalDeleted };
  }

  async deleteNamespace({ repositoryId, branch }) {
    if (!repositoryId) return { deleted: 0 };

    const repoIdStr = String(repositoryId);
    let deletedCount = 0;

    if (branch) {
      const namespace = this._getNamespaceKey(repoIdStr, branch);
      const count = this.storage.get(namespace)?.length || 0;
      this.storage.delete(namespace);
      deletedCount += count;
    } else {
      for (const [key, chunks] of Array.from(this.storage.entries())) {
        if (key.startsWith(`${repoIdStr}:`)) {
          deletedCount += chunks.length;
          this.storage.delete(key);
        }
      }
    }

    return { deleted: deletedCount };
  }

  async healthCheck() {
    let totalChunks = 0;
    for (const chunks of this.storage.values()) {
      totalChunks += chunks.length;
    }
    return {
      healthy: true,
      type: "memory",
      namespaces: this.storage.size,
      totalChunks
    };
  }
}

export default MemoryVectorStore;
