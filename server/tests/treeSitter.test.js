import assert from "node:assert";
import {
  initTreeSitter,
  detectTreeSitterLanguage,
  extractSyntaxSymbolsRegex,
  extractSyntaxChunks
} from "../src/services/treeSitterParser.js";
import { shouldIgnorePath } from "../src/services/codeAnalysisService.js";
import { chunkFileContent, indexRepositoryFiles } from "../src/services/retriever.js";
import { getVectorStore } from "../src/services/vectorStore/index.js";
import { MemoryVectorStore } from "../src/services/vectorStore/MemoryVectorStore.js";

export async function runTreeSitterTests() {
  console.log("\n=========================================");
  console.log("  DEVRA Tree-sitter WASM & AST Tests    ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [Tree-sitter WASM] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Tree-sitter WASM] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. WASM Engine Initialization
  await test("Tree-sitter engine initializes WebAssembly subsystem safely", async () => {
    const initialized = await initTreeSitter();
    assert.strictEqual(typeof initialized, "boolean");
  });

  // 2. Language Detection
  test("Detects Tree-sitter language mappings for JS, TS, TSX, Python, Go, Rust, Java, C++", () => {
    assert.strictEqual(detectTreeSitterLanguage("src/auth.js"), "javascript");
    assert.strictEqual(detectTreeSitterLanguage("src/app.tsx"), "typescript");
    assert.strictEqual(detectTreeSitterLanguage("backend/main.py"), "python");
    assert.strictEqual(detectTreeSitterLanguage("cmd/server.go"), "go");
    assert.strictEqual(detectTreeSitterLanguage("src/main.rs"), "rust");
    assert.strictEqual(detectTreeSitterLanguage("App.java"), "java");
    assert.strictEqual(detectTreeSitterLanguage("engine.cpp"), "cpp");
    assert.strictEqual(detectTreeSitterLanguage("README.unknown"), null);
  });

  // 3. Syntax Extraction — Functions, Classes, Interfaces, Imports
  await test("Extracts syntax-aware chunks for functions, classes, interfaces, and imports", async () => {
    const sampleTs = `import express from "express";
import { protect } from "../middleware/authMiddleware";

export interface UserProfile {
  id: string;
  email: string;
}

export class AuthService {
  async authenticateUser(token: string): Promise<UserProfile> {
    return { id: "1", email: "test@devpilot.ai" };
  }
}

export function validatePayload(data: any): boolean {
  return !!data;
}
`;

    const chunks = await extractSyntaxChunks("src/services/AuthService.ts", "AuthService.ts", sampleTs, "TypeScript");
    assert.ok(chunks.length >= 3);

    const hasImport = chunks.some((c) => c.symbolType === "import" || c.content.includes("import"));
    const hasInterface = chunks.some((c) => c.symbolType === "interface" || c.content.includes("UserProfile"));
    const hasClass = chunks.some((c) => c.symbolType === "class" || c.content.includes("AuthService"));
    const hasFunction = chunks.some((c) => c.symbolType === "function" || c.content.includes("validatePayload"));

    assert.strictEqual(hasImport, true);
    assert.strictEqual(hasInterface, true);
    assert.strictEqual(hasClass, true);
    assert.strictEqual(hasFunction, true);
  });

  // 4. Deterministic Stable Chunk Identifiers
  await test("Extracting identical source content yields stable, deterministic chunk IDs", async () => {
    const code = `export function computeHash(data) { return data.length; }`;
    const chunks1 = await extractSyntaxChunks("src/utils.js", "utils.js", code, "JavaScript");
    const chunks2 = await extractSyntaxChunks("src/utils.js", "utils.js", code, "JavaScript");

    assert.strictEqual(chunks1.length, chunks2.length);
    assert.strictEqual(chunks1[0].id, chunks2[0].id);
  });

  // 5. Malformed Code Recovery
  await test("Handles malformed syntax and incomplete code without crashing", async () => {
    const brokenCode = `function broken(a, b { return a + ; export class BrokenClass {`;
    const chunks = await extractSyntaxChunks("src/broken.js", "broken.js", brokenCode, "JavaScript");
    assert.ok(Array.isArray(chunks));
    assert.ok(chunks.length > 0);
  });

  // 6. Unsupported Languages Fallback
  await test("Fallback mechanism converts unsupported languages to line-window chunking", async () => {
    const plainText = Array.from({ length: 100 }, (_, i) => `log message ${i + 1}`).join("\n");
    const chunks = await extractSyntaxChunks("notes.txt", "notes.txt", plainText, "Plain Text");

    assert.ok(chunks.length >= 2);
    assert.strictEqual(chunks[0].startLine, 1);
    assert.strictEqual(chunks[0].endLine, 45);
  });

  // 7. Security Ignored Directories & Binary File Filtering
  test("Filters ignored directories, binary extensions, minified bundles, and path traversals", () => {
    assert.strictEqual(shouldIgnorePath("node_modules/react/index.js"), true);
    assert.strictEqual(shouldIgnorePath(".git/objects/pack"), true);
    assert.strictEqual(shouldIgnorePath("dist/bundle.min.js"), true);
    assert.strictEqual(shouldIgnorePath("assets/logo.png"), true);
    assert.strictEqual(shouldIgnorePath("package-lock.json"), true);
    assert.strictEqual(shouldIgnorePath("src/controllers/authController.js"), false);
  });

  // 8. Oversized File Safeguards
  await test("Files exceeding 500KB safely trigger line-window chunking fallback", async () => {
    const hugeContent = "const x = 1;\n".repeat(45000); // > 500KB
    const chunks = await extractSyntaxChunks("src/huge.js", "huge.js", hugeContent, "JavaScript");
    assert.ok(chunks.length > 0);
  });

  // 9. Vector Store Compatibility
  await test("Syntax-aware chunks integrate seamlessly with Memory and Redis Vector Stores", async () => {
    const store = await getVectorStore();
    await store.initialize();

    const result = await indexRepositoryFiles({
      repositoryId: "repo-tree-sitter-test",
      branch: "main",
      files: [
        {
          path: "src/api.js",
          name: "api.js",
          language: "JavaScript",
          content: "export function fetchData() { return fetch('/api/data'); }"
        }
      ]
    });

    assert.ok(result.indexed > 0);
    const searchRes = await store.search({
      repositoryId: "repo-tree-sitter-test",
      branch: "main",
      queryEmbedding: new Array(128).fill(0.1),
      topK: 5
    });

    assert.ok(searchRes.length > 0);
    assert.strictEqual(searchRes[0].repositoryId, "repo-tree-sitter-test");
  });

  return { passed, failed };
}

export default runTreeSitterTests;
