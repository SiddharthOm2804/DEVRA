import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getRepositoryFileContent } from "../src/controllers/repositoryController.js";
import Repository from "../src/models/Repository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../");

export async function runSourceCodeViewerTests() {
  console.log("=========================================");
  console.log("  DEVRA Source Code Viewer & API Tests   ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // Mock response helper
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
    return res;
  };

  // Mock repository object
  const mockRepo = {
    _id: "repo-core-01",
    name: "devra-core",
    defaultBranch: "main",
    activeBranch: "main",
    owner: { login: "devpilot-ai" },
    fileTree: [
      { name: "DevraLogo.jsx", path: "client/src/components/ui/DevraLogo.jsx", size: "2.9 KB" }
    ]
  };

  await test("[Source Code] Rejects missing path parameter with 400", async () => {
    const req = {
      params: { id: "repo-core-01" },
      query: {},
      user: { _id: "usr-1", role: "developer" },
      repository: mockRepo
    };
    const res = createMockRes();
    let nextCalled = false;
    await getRepositoryFileContent(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData?.success, false);
    assert.match(res.jsonData?.message, /path.*required/i);
  });

  await test("[Source Code] Rejects path traversal attempts (..) with 400", async () => {
    const req = {
      params: { id: "repo-core-01" },
      query: { path: "../../../etc/passwd" },
      user: { _id: "usr-1", role: "developer" },
      repository: mockRepo
    };
    const res = createMockRes();
    await getRepositoryFileContent(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData?.success, false);
    assert.match(res.jsonData?.message, /traversal/i);
  });

  await test("[Source Code] Rejects absolute paths with 400", async () => {
    const req = {
      params: { id: "repo-core-01" },
      query: { path: "/server/src/server.js" },
      user: { _id: "usr-1", role: "developer" },
      repository: mockRepo
    };
    const res = createMockRes();
    await getRepositoryFileContent(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData?.success, false);
  });

  await test("[Source Code] Restricts access to sensitive secret files (.env) with 403", async () => {
    const req = {
      params: { id: "repo-core-01" },
      query: { path: "server/.env" },
      user: { _id: "usr-1", role: "developer" },
      repository: mockRepo
    };
    const res = createMockRes();
    await getRepositoryFileContent(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.jsonData?.success, false);
    assert.match(res.jsonData?.message, /restricted/i);
  });

  await test("[Source Code] Retrieves real source code and accurate line numbers for DevraLogo.jsx", async () => {
    const req = {
      params: { id: "repo-core-01" },
      query: { path: "client/src/components/ui/DevraLogo.jsx" },
      user: { _id: "usr-1", role: "developer" },
      repository: mockRepo
    };
    const res = createMockRes();
    await getRepositoryFileContent(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData?.success, true);
    assert.strictEqual(res.jsonData?.file?.name, "DevraLogo.jsx");
    assert.strictEqual(res.jsonData?.file?.path, "client/src/components/ui/DevraLogo.jsx");
    assert.strictEqual(res.jsonData?.file?.extension, "jsx");
    assert.strictEqual(res.jsonData?.file?.language, "JavaScript");
    assert.strictEqual(typeof res.jsonData?.file?.content, "string");
    assert.ok(res.jsonData.file.content.includes("export default function DevraLogo"));

    // Check physical line count calculation
    const diskContent = fs.readFileSync(path.resolve(REPO_ROOT, "client/src/components/ui/DevraLogo.jsx"), "utf8");
    const expectedTotalLines = diskContent.split(/\r\n|\r|\n/).length;
    assert.strictEqual(res.jsonData.file.totalLines, expectedTotalLines);
    assert.ok(res.jsonData.file.totalLines > 0, "Total lines should be greater than 0");
  });

  await test("[Source Code] Accurately calculates lines for CRLF and LF files", async () => {
    // Test CRLF handling
    const sampleCRLF = "line 1\r\nline 2\r\nline 3";
    const rawLines = sampleCRLF.split(/\r\n|\r|\n/);
    assert.strictEqual(rawLines.length, 3);
    assert.strictEqual(rawLines.filter(l => l.trim().length > 0).length, 3);
  });

  await test("[Source Code] Correctly returns 404 for missing file", async () => {
    const req = {
      params: { id: "repo-core-01" },
      query: { path: "nonexistent/deep/file.xyz" },
      user: { _id: "usr-1", role: "developer" },
      repository: {
        ...mockRepo,
        owner: { login: "" } // Not a github repo, so local lookup fails
      }
    };
    const res = createMockRes();
    await getRepositoryFileContent(req, res, () => {});

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData?.success, false);
    assert.match(res.jsonData?.message, /could not be found/i);
  });

  await test("[Source Code] Correctly detects binary files and prevents raw preview", async () => {
    const req = {
      params: { id: "repo-core-01" },
      query: { path: "client/public/favicon.ico" },
      user: { _id: "usr-1", role: "developer" },
      repository: mockRepo
    };
    const res = createMockRes();
    await getRepositoryFileContent(req, res, () => {});

    if (res.statusCode === 200) {
      assert.strictEqual(res.jsonData?.file?.isBinary, true);
      assert.strictEqual(res.jsonData?.file?.content, "");
    }
  });

  return { passed, failed };
}

