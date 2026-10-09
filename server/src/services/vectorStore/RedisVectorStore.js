import { getRedisClient } from "../../config/redis.js";
import { config } from "../../config/env.js";
import VectorStore from "./VectorStore.js";
import { cosineSimilarity } from "../embeddingService.js";
import logger from "../../utils/logger.js";

/**
 * Redis Stack Persistent Vector Store implementation
 * Utilizes RediSearch HNSW / FLAT vector similarity indexing with tag-based repository isolation.
 */
export class RedisVectorStore extends VectorStore {
  constructor(customClient = null) {
    super();
    this.client = customClient;
    this.indexName = config.rag.indexName || "devra:idx:codebase";
    this.keyPrefix = config.rag.keyPrefix || "devra:doc:";
    this.dimension = config.rag.vectorDimension || 128;
    this.distanceMetric = config.rag.distanceMetric || "COSINE";
    this.hasRediSearch = null;
    this.initialized = false;
  }

  getName() {
    return "redis";
  }

  _getClient() {
    if (!this.client) {
      this.client = getRedisClient();
    }
    return this.client;
  }

  _getKey(repositoryId, branch, chunkId) {
    return `${this.keyPrefix}${repositoryId}:${branch || "main"}:${chunkId}`;
  }

  _escapeTag(str) {
    if (!str) return "";
    return String(str).replace(/[,.<>{}[\]"':;!@#$%^&*()\-+=~|\\\/]/g, "\\$&");
  }

  _vectorToBuffer(vector) {
    return Buffer.from(new Float32Array(vector).buffer);
  }

  _bufferToVector(buffer) {
    if (!buffer) return [];
    if (Array.isArray(buffer)) return buffer;
    if (Buffer.isBuffer(buffer)) {
      const floatArray = new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / Float32Array.BYTES_PER_ELEMENT
      );
      return Array.from(floatArray);
    }
    return [];
  }

  /**
   * Initializes the RediSearch Vector Index in Redis
   */
  async initialize() {
    const client = this._getClient();
    if (!client) {
      logger.warn("[RedisVectorStore] Redis client not initialized.");
      return false;
    }

    try {
      // Check if index already exists
      try {
        await client.call("FT.INFO", this.indexName);
        this.hasRediSearch = true;
        this.initialized = true;
        logger.info(`[RedisVectorStore] Existing vector index '${this.indexName}' verified.`);
        return true;
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("unknown command")) {
          // Redis instance without RediSearch module
          this.hasRediSearch = false;
          this.initialized = true;
          logger.warn("[RedisVectorStore] RediSearch module not detected on Redis server. Operating in Redis Hash storage mode with client similarity.");
          return true;
        }

        if (!msg.includes("unknown index") && !msg.includes("no such index")) {
          throw err;
        }
      }

      // Create new Vector Index
      logger.info(`[RedisVectorStore] Creating vector index '${this.indexName}' (dim=${this.dimension}, metric=${this.distanceMetric})...`);

      const createArgs = [
        "FT.CREATE",
        this.indexName,
        "ON",
        "HASH",
        "PREFIX",
        "1",
        this.keyPrefix,
        "SCHEMA",
        "repositoryId",
        "TAG",
        "SORTABLE",
        "branch",
        "TAG",
        "SORTABLE",
        "filePath",
        "TEXT",
        "NOSTEM",
        "fileName",
        "TEXT",
        "NOSTEM",
        "language",
        "TAG",
        "startLine",
        "NUMERIC",
        "endLine",
        "NUMERIC",
        "content",
        "TEXT",
        "metadata",
        "TEXT",
        "embedding",
        "VECTOR",
        "HNSW",
        "6",
        "TYPE",
        "FLOAT32",
        "DIM",
        this.dimension.toString(),
        "DISTANCE_METRIC",
        this.distanceMetric
      ];

      await client.call(...createArgs);
      this.hasRediSearch = true;
      this.initialized = true;
      logger.info(`[RedisVectorStore] Vector index '${this.indexName}' created successfully.`);
      return true;
    } catch (err) {
      logger.warn(`[RedisVectorStore] Index initialization notice: ${err.message}`);
      this.initialized = true;
      return false;
    }
  }

  /**
   * Upserts code chunks in batch using Redis pipelines
   */
  async upsert(chunks = []) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return { inserted: 0, failed: 0 };
    }

    const client = this._getClient();
    if (!client) {
      throw new Error("Redis client is not available for upsert");
    }

    if (!this.initialized) {
      await this.initialize();
    }

    const pipeline = client.pipeline();
    let validCount = 0;
    let failedCount = 0;

    for (const chunk of chunks) {
      try {
        if (!chunk.repositoryId || !chunk.id || !chunk.embedding) {
          failedCount++;
          continue;
        }

        const key = this._getKey(chunk.repositoryId, chunk.branch, chunk.id);
        const embeddingBuffer = this._vectorToBuffer(chunk.embedding);

        const hashData = {
          id: chunk.id,
          repositoryId: String(chunk.repositoryId),
          branch: chunk.branch || "main",
          filePath: chunk.filePath || "",
          fileName: chunk.fileName || "",
          language: chunk.language || "JavaScript",
          startLine: String(chunk.startLine || 1),
          endLine: String(chunk.endLine || 1),
          content: chunk.content || "",
          metadata: JSON.stringify(chunk.metadata || {}),
          embedding: embeddingBuffer
        };

        pipeline.hset(key, hashData);
        validCount++;
      } catch (err) {
        failedCount++;
      }
    }

    if (validCount > 0) {
      const results = await pipeline.exec();
      for (const [err] of results) {
        if (err) {
          failedCount++;
          validCount--;
        }
      }
    }

    logger.debug(`[RedisVectorStore] Upserted ${validCount} chunks (${failedCount} failed)`);
    return { inserted: validCount, failed: failedCount };
  }

  /**
   * Performs vector similarity search with strict repository isolation
   */
  async search({ repositoryId, branch, queryEmbedding, queryText = "", topK = 4 }) {
    if (!repositoryId || !queryEmbedding || !Array.isArray(queryEmbedding)) {
      return [];
    }

    const client = this._getClient();
    if (!client) {
      throw new Error("Redis client is not available for search");
    }

    if (!this.initialized) {
      await this.initialize();
    }

    const repoIdStr = String(repositoryId);
    const escapedRepoId = this._escapeTag(repoIdStr);
    const escapedBranch = branch ? this._escapeTag(branch) : "";

    // 1. Native RediSearch Vector Search (Preferred Path)
    if (this.hasRediSearch !== false) {
      try {
        let filterTag = `@repositoryId:{${escapedRepoId}}`;
        if (branch) {
          filterTag += ` @branch:{${escapedBranch}}`;
        }

        const kCount = Math.max(topK * 3, 10);
        const searchQuery = `(${filterTag})=>[KNN ${kCount} @embedding $BLOB AS vector_score]`;
        const queryBlob = this._vectorToBuffer(queryEmbedding);

        const searchArgs = [
          "FT.SEARCH",
          this.indexName,
          searchQuery,
          "PARAMS",
          "2",
          "BLOB",
          queryBlob,
          "SORTBY",
          "vector_score",
          "ASC",
          "LIMIT",
          "0",
          String(kCount),
          "DIALECT",
          "2"
        ];

        const rawResults = await client.call(...searchArgs);

        if (!rawResults || rawResults.length <= 1) {
          return [];
        }

        const totalHits = rawResults[0];
        const docs = [];

        // RediSearch response format: [totalCount, key1, [f1, v1, f2, v2], key2, [f1, v1, ...]]
        for (let i = 1; i < rawResults.length; i += 2) {
          const key = rawResults[i];
          const fieldsArr = rawResults[i + 1];
          const docObj = { key };

          if (Array.isArray(fieldsArr)) {
            for (let j = 0; j < fieldsArr.length; j += 2) {
              const fieldName = fieldsArr[j];
              const val = fieldsArr[j + 1];
              docObj[fieldName] = val;
            }
          }

          // Double check repository isolation
          if (docObj.repositoryId !== repoIdStr) {
            continue;
          }

          // Cosine distance to similarity: similarity = 1 - distance
          const distance = parseFloat(docObj.vector_score || "1.0");
          let similarity = Math.max(0, Math.min(1.0, 1.0 - distance));

          // Hybrid keyword relevance boost
          const lowerQuery = (queryText || "").toLowerCase();
          if (lowerQuery) {
            const lowerPath = (docObj.filePath || "").toLowerCase();
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

          const finalScore = Math.min(1.0, Math.max(0, similarity));

          let parsedMetadata = {};
          try {
            parsedMetadata = docObj.metadata ? JSON.parse(docObj.metadata) : {};
          } catch (_) {}

          docs.push({
            id: docObj.id || key,
            repositoryId: docObj.repositoryId,
            branch: docObj.branch || "main",
            filePath: docObj.filePath || "",
            fileName: docObj.fileName || "",
            language: docObj.language || "JavaScript",
            startLine: parseInt(docObj.startLine || "1", 10),
            endLine: parseInt(docObj.endLine || "1", 10),
            content: docObj.content || "",
            metadata: parsedMetadata,
            score: finalScore,
            relevanceScore: Math.round(finalScore * 100)
          });
        }

        docs.sort((a, b) => b.score - a.score);
        return docs.slice(0, topK);
      } catch (err) {
        logger.debug(`[RedisVectorStore] FT.SEARCH query notice: ${err.message}. Falling back to key scan.`);
      }
    }

    // 2. Fallback: Key Scan for repository chunks
    return await this._scanAndRankChunks({ repositoryId: repoIdStr, branch, queryEmbedding, queryText, topK });
  }

  /**
   * Fallback retrieval via Redis key scan when RediSearch module is unavailable
   */
  async _scanAndRankChunks({ repositoryId, branch, queryEmbedding, queryText, topK }) {
    const client = this._getClient();
    const pattern = branch
      ? `${this.keyPrefix}${repositoryId}:${branch}:*`
      : `${this.keyPrefix}${repositoryId}:*`;

    let cursor = "0";
    const keys = [];

    do {
      const [nextCursor, matchedKeys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = nextCursor;
      if (matchedKeys && matchedKeys.length > 0) {
        keys.push(...matchedKeys);
      }
    } while (cursor !== "0");

    if (keys.length === 0) {
      return [];
    }

    const pipeline = client.pipeline();
    for (const key of keys) {
      pipeline.hgetallBuffer(key);
    }
    const results = await pipeline.exec();

    const scored = [];
    const lowerQuery = (queryText || "").toLowerCase();

    for (let idx = 0; idx < results.length; idx++) {
      const [err, rawHash] = results[idx];
      if (err || !rawHash) continue;

      const hash = {};
      for (const [k, v] of Object.entries(rawHash)) {
        if (k === "embedding") {
          hash[k] = this._bufferToVector(v);
        } else {
          hash[k] = v.toString("utf8");
        }
      }

      if (hash.repositoryId !== repositoryId) continue;

      let similarity = cosineSimilarity(queryEmbedding, hash.embedding);

      if (lowerQuery) {
        const lowerPath = (hash.filePath || "").toLowerCase();
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
      let parsedMetadata = {};
      try {
        parsedMetadata = hash.metadata ? JSON.parse(hash.metadata) : {};
      } catch (_) {}

      scored.push({
        id: hash.id || keys[idx],
        repositoryId: hash.repositoryId,
        branch: hash.branch || "main",
        filePath: hash.filePath || "",
        fileName: hash.fileName || "",
        language: hash.language || "JavaScript",
        startLine: parseInt(hash.startLine || "1", 10),
        endLine: parseInt(hash.endLine || "1", 10),
        content: hash.content || "",
        metadata: parsedMetadata,
        score,
        relevanceScore: Math.round(score * 100)
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Deletes specific chunk IDs
   */
  async delete({ repositoryId, branch = "main", chunkIds = [] }) {
    if (!repositoryId || !Array.isArray(chunkIds) || chunkIds.length === 0) {
      return { deleted: 0 };
    }

    const client = this._getClient();
    const pipeline = client.pipeline();

    for (const chunkId of chunkIds) {
      const key = this._getKey(repositoryId, branch, chunkId);
      pipeline.del(key);
    }

    const results = await pipeline.exec();
    let deleted = 0;
    for (const [err, count] of results) {
      if (!err && count > 0) deleted += count;
    }

    return { deleted };
  }

  /**
   * Deletes all vector embeddings for a given repository (and optional branch)
   */
  async deleteNamespace({ repositoryId, branch }) {
    if (!repositoryId) return { deleted: 0 };

    const client = this._getClient();
    const pattern = branch
      ? `${this.keyPrefix}${repositoryId}:${branch}:*`
      : `${this.keyPrefix}${repositoryId}:*`;

    let cursor = "0";
    let deletedCount = 0;

    do {
      const [nextCursor, matchedKeys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = nextCursor;

      if (matchedKeys && matchedKeys.length > 0) {
        const pipeline = client.pipeline();
        for (const key of matchedKeys) {
          pipeline.del(key);
        }
        const results = await pipeline.exec();
        for (const [err, count] of results) {
          if (!err && count > 0) deletedCount += count;
        }
      }
    } while (cursor !== "0");

    logger.info(`[RedisVectorStore] Deleted ${deletedCount} vector keys for repository ${repositoryId}`);
    return { deleted: deletedCount };
  }

  /**
   * Health check for Redis vector store
   */
  async healthCheck() {
    try {
      const client = this._getClient();
      await client.ping();

      let hasIndex = false;
      try {
        await client.call("FT.INFO", this.indexName);
        hasIndex = true;
      } catch (_) {}

      return {
        healthy: true,
        type: "redis",
        indexName: this.indexName,
        hasRediSearch: this.hasRediSearch !== false,
        indexExists: hasIndex
      };
    } catch (err) {
      return {
        healthy: false,
        type: "redis",
        error: err.message
      };
    }
  }
}

export default RedisVectorStore;
