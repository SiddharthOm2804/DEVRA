/**
 * Base Abstract Class for DEVRA Vector Store implementations
 * 
 * Provides a uniform contract for persistent vector search databases
 * (Redis, pgvector, Qdrant, Pinecone, or in-memory fallback).
 */
export class VectorStore {
  /**
   * Initializes the vector index or namespace if required
   */
  async initialize() {
    throw new Error("VectorStore.initialize() must be implemented by subclass");
  }

  /**
   * Upserts one or multiple code chunks into the vector store
   * @param {Array<Object>} chunks - Array of chunk objects with embeddings & metadata
   * @returns {Promise<{ inserted: number, failed: number }>}
   */
  async upsert(chunks = []) {
    throw new Error("VectorStore.upsert() must be implemented by subclass");
  }

  /**
   * Performs vector similarity search scoped to a repository and optional branch
   * @param {Object} options
   * @param {string} options.repositoryId - Mandatory repository identifier for isolation
   * @param {string} [options.branch] - Optional branch identifier
   * @param {Array<number>} options.queryEmbedding - Vector embedding of the search query
   * @param {string} [options.queryText] - Raw query string for hybrid keyword scoring
   * @param {number} [options.topK=4] - Number of top results to return
   * @param {Object} [options.filter] - Additional metadata filters
   * @returns {Promise<Array<Object>>} Scored chunks
   */
  async search(options = {}) {
    throw new Error("VectorStore.search() must be implemented by subclass");
  }

  /**
   * Deletes specific chunk IDs from a repository's vector index
   * @param {Object} options
   * @param {string} options.repositoryId
   * @param {string} [options.branch]
   * @param {Array<string>} options.chunkIds
   */
  async delete(options = {}) {
    throw new Error("VectorStore.delete() must be implemented by subclass");
  }

  /**
   * Deletes all vector embeddings for a given repository (and optional branch)
   * Essential for complete re-indexing and repository deletion
   * @param {Object} options
   * @param {string} options.repositoryId
   * @param {string} [options.branch]
   * @returns {Promise<{ deleted: number }>}
   */
  async deleteNamespace(options = {}) {
    throw new Error("VectorStore.deleteNamespace() must be implemented by subclass");
  }

  /**
   * Performs a health check on the underlying storage backend
   * @returns {Promise<{ healthy: boolean, type: string, details?: any }>}
   */
  async healthCheck() {
    throw new Error("VectorStore.healthCheck() must be implemented by subclass");
  }

  /**
   * Returns human-readable name of the vector store backend
   * @returns {string}
   */
  getName() {
    return "base";
  }
}

export default VectorStore;
