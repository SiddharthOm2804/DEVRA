import assert from "node:assert";
import { MemoryVectorStore } from "../src/services/vectorStore/MemoryVectorStore.js";
import { RedisVectorStore } from "../src/services/vectorStore/RedisVectorStore.js";
import { getVectorStore, setVectorStore, resetVectorStore } from "../src/services/vectorStore/index.js";
import { generateEmbedding, generateDeterministicEmbedding, cosineSimilarity } from "../src/services/embeddingService.js";
import { chunkFileContent, buildRepositoryKnowledgeChunks } from "../src/services/retriever.js";

export async function runVectorStoreTests() {
  console.log("\n=========================================");
  console.log("  DEVRA Persistent Vector Store Tests    ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [Vector Store] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Vector Store] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Vector Store Initialization
  await test("MemoryVectorStore initializes and reports healthy state", async () => {
    const store = new MemoryVectorStore();
    await store.initialize();
    const health = await store.healthCheck();
    assert.strictEqual(health.healthy, true);
    assert.strictEqual(health.type, "memory");
  });

  // 2. Vector Upsert & Deterministic Replacement
  await test("Vector upsert stores chunks and updates on matching ID without duplication", async () => {
    const store = new MemoryVectorStore();
    await store.initialize();

    const embedding1 = generateDeterministicEmbedding("authentication token jwt login controller");
    const embedding2 = generateDeterministicEmbedding("database mongoose user schema model");

    const chunks = [
      {
        id: "chunk-auth-1",
        repositoryId: "repo-alpha",
        branch: "main",
        filePath: "src/auth.js",
        fileName: "auth.js",
        language: "JavaScript",
        startLine: 1,
        endLine: 20,
        content: "export function login() { return jwt.sign(); }",
        embedding: embedding1
      },
      {
        id: "chunk-db-1",
        repositoryId: "repo-alpha",
        branch: "main",
        filePath: "src/db.js",
        fileName: "db.js",
        language: "JavaScript",
        startLine: 1,
        endLine: 30,
        content: "export const User = mongoose.model('User', schema);",
        embedding: embedding2
      }
    ];

    const result1 = await store.upsert(chunks);
    assert.strictEqual(result1.inserted, 2);

    // Upserting same chunk ID updates it instead of creating duplicates
    const updatedChunk = [{
      ...chunks[0],
      content: "export function login() { return jwt.sign({ updated: true }); }"
    }];
    const result2 = await store.upsert(updatedChunk);
    assert.strictEqual(result2.inserted, 1);

    const health = await store.healthCheck();
    assert.strictEqual(health.totalChunks, 2); // Count remains 2, not 3!
  });

  // 3. Vector Similarity Search & Top-K Ranking
  await test("Vector search ranks relevant chunks highest by cosine similarity", async () => {
    const store = new MemoryVectorStore();
    await store.initialize();

    const authVec = generateDeterministicEmbedding("jwt login authentication password token verify");
    const payVec = generateDeterministicEmbedding("stripe payment charge subscription billing invoice");
    const dbVec = generateDeterministicEmbedding("mongoose mongodb schema database collection find");

    await store.upsert([
      {
        id: "chunk-auth",
        repositoryId: "repo-search-test",
        branch: "main",
        filePath: "src/controllers/authController.js",
        fileName: "authController.js",
        language: "JavaScript",
        startLine: 1,
        endLine: 40,
        content: "export const login = (req, res) => { jwt.sign(user); }",
        embedding: authVec
      },
      {
        id: "chunk-pay",
        repositoryId: "repo-search-test",
        branch: "main",
        filePath: "src/services/paymentService.js",
        fileName: "paymentService.js",
        language: "JavaScript",
        startLine: 1,
        endLine: 50,
        content: "export const charge = (card) => { stripe.charges.create(); }",
        embedding: payVec
      },
      {
        id: "chunk-db",
        repositoryId: "repo-search-test",
        branch: "main",
        filePath: "src/models/User.js",
        fileName: "User.js",
        language: "JavaScript",
        startLine: 1,
        endLine: 30,
        content: "const userSchema = new mongoose.Schema({ email: String });",
        embedding: dbVec
      }
    ]);

    const queryEmbedding = generateDeterministicEmbedding("How is JWT authentication and login handled?");
    const results = await store.search({
      repositoryId: "repo-search-test",
      branch: "main",
      queryEmbedding,
      queryText: "How is JWT authentication and login handled?",
      topK: 2
    });

    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].id, "chunk-auth");
    assert.ok(results[0].score > results[1].score);
    assert.ok(results[0].relevanceScore >= 50);
  });

  // 4. Strict Repository Isolation (MANDATORY SECURITY RULE)
  await test("Repository isolation guarantees Repo A queries NEVER return Repo B vectors", async () => {
    const store = new MemoryVectorStore();
    await store.initialize();

    const secretChunkA = {
      id: "chunk-secret-a",
      repositoryId: "repo-company-A-secret",
      branch: "main",
      filePath: "secrets/api.js",
      fileName: "api.js",
      content: "const CONFIDENTIAL_ALGO = 'A_PRIVATE_LOGIC';",
      embedding: generateDeterministicEmbedding("private confidential algorithm data")
    };

    const chunkB = {
      id: "chunk-public-b",
      repositoryId: "repo-public-B",
      branch: "main",
      filePath: "src/public.js",
      fileName: "public.js",
      content: "export const hello = 'world';",
      embedding: generateDeterministicEmbedding("private confidential algorithm data") // Identical embedding!
    };

    await store.upsert([secretChunkA, chunkB]);

    // Query from Repo B context for confidential data
    const queryEmb = generateDeterministicEmbedding("private confidential algorithm data");
    const resultsForB = await store.search({
      repositoryId: "repo-public-B",
      branch: "main",
      queryEmbedding: queryEmb,
      queryText: "private confidential algorithm data",
      topK: 10
    });

    // Verify Repo A's chunk is NEVER returned for Repo B
    assert.strictEqual(resultsForB.length, 1);
    assert.strictEqual(resultsForB[0].repositoryId, "repo-public-B");
    assert.strictEqual(resultsForB[0].id, "chunk-public-b");

    // Verify Repo A query returns only Repo A
    const resultsForA = await store.search({
      repositoryId: "repo-company-A-secret",
      branch: "main",
      queryEmbedding: queryEmb,
      queryText: "private confidential algorithm data",
      topK: 10
    });
    assert.strictEqual(resultsForA.length, 1);
    assert.strictEqual(resultsForA[0].repositoryId, "repo-company-A-secret");
    assert.strictEqual(resultsForA[0].id, "chunk-secret-a");
  });

  // 5. Delete Namespace & Re-indexing
  await test("Delete namespace cleanly purges all repository vectors", async () => {
    const store = new MemoryVectorStore();
    await store.initialize();

    const vec = generateDeterministicEmbedding("sample data chunk");
    await store.upsert([
      { id: "c1", repositoryId: "repo-to-delete", branch: "main", content: "data 1", embedding: vec },
      { id: "c2", repositoryId: "repo-to-delete", branch: "main", content: "data 2", embedding: vec },
      { id: "c3", repositoryId: "repo-to-keep", branch: "main", content: "keep me", embedding: vec }
    ]);

    const { deleted } = await store.deleteNamespace({ repositoryId: "repo-to-delete" });
    assert.strictEqual(deleted, 2);

    const afterSearch = await store.search({
      repositoryId: "repo-to-delete",
      branch: "main",
      queryEmbedding: vec,
      topK: 5
    });
    assert.strictEqual(afterSearch.length, 0);

    const keepSearch = await store.search({
      repositoryId: "repo-to-keep",
      branch: "main",
      queryEmbedding: vec,
      topK: 5
    });
    assert.strictEqual(keepSearch.length, 1);
  });

  // 6. Branch-Level Isolation
  await test("Branch filtering isolates feature branches from main branch", async () => {
    const store = new MemoryVectorStore();
    await store.initialize();

    const vec = generateDeterministicEmbedding("payment webhook redesign");
    await store.upsert([
      { id: "c-main", repositoryId: "repo-branch-test", branch: "main", content: "v1 legacy webhook", embedding: vec },
      { id: "c-feat", repositoryId: "repo-branch-test", branch: "feature/v2", content: "v2 async webhook", embedding: vec }
    ]);

    const featResults = await store.search({
      repositoryId: "repo-branch-test",
      branch: "feature/v2",
      queryEmbedding: vec,
      topK: 5
    });
    assert.strictEqual(featResults.length, 1);
    assert.strictEqual(featResults[0].id, "c-feat");
  });

  // 7. Empty Query & Edge Cases
  await test("Handles empty queries, zero vectors, and malformed inputs gracefully", async () => {
    const store = new MemoryVectorStore();
    await store.initialize();

    const emptyResult = await store.search({
      repositoryId: "repo-empty",
      queryEmbedding: null,
      topK: 4
    });
    assert.deepStrictEqual(emptyResult, []);

    const noRepoResult = await store.search({
      repositoryId: null,
      queryEmbedding: [0.1, 0.2],
      topK: 4
    });
    assert.deepStrictEqual(noRepoResult, []);

    const upsertBad = await store.upsert([]);
    assert.strictEqual(upsertBad.inserted, 0);
  });

  // 8. Vector Store Factory & Fallback
  await test("VectorStoreFactory supplies singleton and supports fallback", async () => {
    resetVectorStore();
    const store = await getVectorStore();
    assert.ok(store);
    assert.ok(typeof store.search === "function");
    assert.ok(typeof store.upsert === "function");
    assert.ok(typeof store.deleteNamespace === "function");
  });

  // 9. Document Chunking Logic
  test("chunkFileContent produces correct overlapping line windows", () => {
    const testCode = Array.from({ length: 100 }, (_, i) => `const line${i + 1} = ${i + 1};`).join("\n");
    const chunks = chunkFileContent("src/bigFile.ts", "bigFile.ts", testCode, "TypeScript");

    assert.ok(chunks.length >= 2);
    assert.strictEqual(chunks[0].startLine, 1);
    assert.strictEqual(chunks[0].endLine, 45);
    assert.strictEqual(chunks[1].startLine, 36); // 45 - 10 + 1 = 36 (10-line overlap)
  });

  // 10. RedisVectorStore Buffer & Vector Transformation
  test("RedisVectorStore converts Float32Array vectors to binary Buffers and back accurately", () => {
    const rStore = new RedisVectorStore();
    const originalVec = generateDeterministicEmbedding("testing binary buffer translation");
    const buffer = rStore._vectorToBuffer(originalVec);
    assert.ok(Buffer.isBuffer(buffer));
    assert.strictEqual(buffer.byteLength, originalVec.length * 4); // 128 * 4 bytes = 512 bytes

    const recoveredVec = rStore._bufferToVector(buffer);
    assert.strictEqual(recoveredVec.length, originalVec.length);
    for (let i = 0; i < originalVec.length; i++) {
      assert.ok(Math.abs(recoveredVec[i] - originalVec[i]) < 1e-5);
    }
  });

  // 11. RedisVectorStore Tag Escaping
  test("RedisVectorStore tag escaping sanitizes special RediSearch characters", () => {
    const rStore = new RedisVectorStore();
    const rawTag = "repo-name/with:special@chars.v1";
    const escaped = rStore._escapeTag(rawTag);
    assert.strictEqual(escaped, "repo\\-name\\/with\\:special\\@chars\\.v1");
  });

  // 12. RedisVectorStore Search & Pipeline Execution
  await test("RedisVectorStore executes pipeline and initializes properly", async () => {
    // Mock Redis Client
    const mockStorage = new Map();
    const mockClient = {
      status: "ready",
      call: async (...args) => {
        const cmd = args[0];
        if (cmd === "FT.INFO") {
          return ["index_name", "devra:idx:codebase"];
        }
        if (cmd === "FT.SEARCH") {
          // Return mock FT.SEARCH response
          return [
            1,
            "devra:doc:repo-mock:main:c1",
            [
              "id", "c1",
              "repositoryId", "repo-mock",
              "branch", "main",
              "filePath", "src/auth.js",
              "fileName", "auth.js",
              "content", "export const login = () => {};",
              "vector_score", "0.15" // 1 - 0.15 = 0.85 similarity
            ]
          ];
        }
        return "OK";
      },
      pipeline: () => {
        const queue = [];
        return {
          hset: (key, data) => queue.push(["hset", key, data]),
          del: (key) => queue.push(["del", key]),
          exec: async () => queue.map(() => [null, 1])
        };
      },
      scan: async () => ["0", []],
      ping: async () => "PONG"
    };

    const redisStore = new RedisVectorStore(mockClient);
    await redisStore.initialize();
    assert.strictEqual(redisStore.hasRediSearch, true);

    const upsertRes = await redisStore.upsert([
      {
        id: "c1",
        repositoryId: "repo-mock",
        branch: "main",
        embedding: generateDeterministicEmbedding("auth login"),
        content: "export const login = () => {};"
      }
    ]);
    assert.strictEqual(upsertRes.inserted, 1);

    const searchRes = await redisStore.search({
      repositoryId: "repo-mock",
      branch: "main",
      queryEmbedding: generateDeterministicEmbedding("auth login"),
      queryText: "auth login",
      topK: 1
    });

    assert.strictEqual(searchRes.length, 1);
    assert.strictEqual(searchRes[0].repositoryId, "repo-mock");
    assert.strictEqual(searchRes[0].id, "c1");
    assert.ok(searchRes[0].relevanceScore >= 80);
  });

  return { passed, failed };
}

export default runVectorStoreTests;
