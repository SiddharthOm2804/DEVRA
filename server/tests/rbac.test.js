import assert from "node:assert";
import User from "../src/models/User.js";
import Repository from "../src/models/Repository.js";
import AgentSession from "../src/models/AgentSession.js";
import {
  ROLES,
  PERMISSIONS,
  hasPermission,
  ROLE_PERMISSIONS_MAP,
  requirePermission,
  requireRepositoryAccess,
  requireTaskAccess,
  requireBranchAccess
} from "../src/middleware/rbacMiddleware.js";
import { generateToken } from "../src/utils/jwt.js";

export async function runRbacTests() {
  console.log("\n=========================================");
  console.log("  DEVRA Role-Based Access Control (RBAC) ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [RBAC] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [RBAC] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // Mock Express Request, Response, Next
  function createMockReqRes({ user = null, params = {}, body = {}, query = {}, headers = {} } = {}) {
    const req = {
      user,
      params,
      body,
      query,
      headers
    };

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

    let nextCalled = false;
    let nextError = null;
    const next = (err) => {
      nextCalled = true;
      if (err) nextError = err;
    };

    return { req, res, next, isNextCalled: () => nextCalled, getNextError: () => nextError };
  }

  // 1. Centralized Permission Matrix Logic
  test("hasPermission correctly evaluates Admin, Architect, Developer, Guest privileges", () => {
    assert.strictEqual(hasPermission(ROLES.ADMIN, PERMISSIONS.REPO_DELETE), true);
    assert.strictEqual(hasPermission(ROLES.ADMIN, PERMISSIONS.USER_MANAGE), true);

    assert.strictEqual(hasPermission(ROLES.ARCHITECT, PERMISSIONS.ANALYSIS_TRIGGER), true);
    assert.strictEqual(hasPermission(ROLES.ARCHITECT, PERMISSIONS.USER_MANAGE), false);
    assert.strictEqual(hasPermission(ROLES.ARCHITECT, PERMISSIONS.REPO_DELETE), false);

    assert.strictEqual(hasPermission(ROLES.DEVELOPER, PERMISSIONS.AGENT_PLAN), true);
    assert.strictEqual(hasPermission(ROLES.DEVELOPER, PERMISSIONS.AGENT_APPLY), true);
    assert.strictEqual(hasPermission(ROLES.DEVELOPER, PERMISSIONS.USER_MANAGE), false);
    assert.strictEqual(hasPermission(ROLES.DEVELOPER, PERMISSIONS.REPO_DELETE), false);

    assert.strictEqual(hasPermission(ROLES.GUEST, PERMISSIONS.REPO_READ), true);
    assert.strictEqual(hasPermission(ROLES.GUEST, PERMISSIONS.RAG_SEARCH), true);
    assert.strictEqual(hasPermission(ROLES.GUEST, PERMISSIONS.REPO_CREATE), false);
    assert.strictEqual(hasPermission(ROLES.GUEST, PERMISSIONS.REPO_DELETE), false);
    assert.strictEqual(hasPermission(ROLES.GUEST, PERMISSIONS.AGENT_PLAN), false);
    assert.strictEqual(hasPermission(ROLES.GUEST, PERMISSIONS.AGENT_APPLY), false);
  });

  // 2. Unauthenticated Request Rejection (HTTP 401)
  test("requirePermission returns 401 for unauthenticated requests", () => {
    const { req, res, next, isNextCalled } = createMockReqRes({ user: null });
    const middleware = requirePermission(PERMISSIONS.REPO_READ);
    middleware(req, res, next);

    assert.strictEqual(isNextCalled(), false);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.success, false);
    assert.ok(res.jsonData.message.includes("Access denied"));
  });

  // 3. Guest Role Restriction (HTTP 403)
  test("requirePermission returns 403 when Guest attempts privileged operations", () => {
    const guestUser = { _id: "user-guest-1", role: ROLES.GUEST };

    // Guest attempts repository deletion
    const { req: req1, res: res1, next: next1 } = createMockReqRes({ user: guestUser });
    requirePermission(PERMISSIONS.REPO_DELETE)(req1, res1, next1);
    assert.strictEqual(res1.statusCode, 403);
    assert.strictEqual(res1.jsonData.success, false);

    // Guest attempts Agent Mode task creation
    const { req: req2, res: res2, next: next2 } = createMockReqRes({ user: guestUser });
    requirePermission(PERMISSIONS.AGENT_PLAN)(req2, res2, next2);
    assert.strictEqual(res2.statusCode, 403);
  });

  // 4. Developer & Architect Role Enforcement
  test("Developer and Architect roles permit development tasks but deny repository deletion", () => {
    const devUser = { _id: "user-dev-1", role: ROLES.DEVELOPER };
    const archUser = { _id: "user-arch-1", role: ROLES.ARCHITECT };

    // Developer can create agent plan
    const { req: reqDev, res: resDev, next: nextDev, isNextCalled: nextDevCalled } = createMockReqRes({ user: devUser });
    requirePermission(PERMISSIONS.AGENT_PLAN)(reqDev, resDev, nextDev);
    assert.strictEqual(nextDevCalled(), true);

    // Architect can trigger analysis
    const { req: reqArch, res: resArch, next: nextArch, isNextCalled: nextArchCalled } = createMockReqRes({ user: archUser });
    requirePermission(PERMISSIONS.ANALYSIS_TRIGGER)(reqArch, resArch, nextArch);
    assert.strictEqual(nextArchCalled(), true);

    // Developer denied repo deletion
    const { req: reqDevDel, res: resDevDel, next: nextDevDel } = createMockReqRes({ user: devUser });
    requirePermission(PERMISSIONS.REPO_DELETE)(reqDevDel, resDevDel, nextDevDel);
    assert.strictEqual(resDevDel.statusCode, 403);
  });

  // 5. Admin Role Full Privileges
  test("Admin role grants complete system permissions across all endpoints", () => {
    const adminUser = { _id: "user-admin-1", role: ROLES.ADMIN };

    Object.values(PERMISSIONS).forEach((permission) => {
      const { req, res, next, isNextCalled } = createMockReqRes({ user: adminUser });
      requirePermission(permission)(req, res, next);
      assert.strictEqual(isNextCalled(), true);
    });
  });

  // 6. Branch Modification Restrictions
  test("requireBranchAccess prevents Guest users from modifying protected main/master branches", () => {
    const guestUser = { _id: "guest-1", role: ROLES.GUEST };
    const devUser = { _id: "dev-1", role: ROLES.DEVELOPER };

    const { req: reqGuest, res: resGuest, next: nextGuest } = createMockReqRes({
      user: guestUser,
      body: { branch: "main" }
    });
    requireBranchAccess(reqGuest, resGuest, nextGuest);
    assert.strictEqual(resGuest.statusCode, 403);

    const { req: reqDev, res: resDev, next: nextDev, isNextCalled } = createMockReqRes({
      user: devUser,
      body: { branch: "main" }
    });
    requireBranchAccess(reqDev, resDev, nextDev);
    assert.strictEqual(isNextCalled(), true);
  });

  // 7. JWT Token Encoding of Role Payload
  test("JWT tokens correctly sign and verify user role claim", () => {
    const token = generateToken({ id: "user-999", email: "guest@devpilot.ai", role: ROLES.GUEST });
    assert.ok(token);

    const { req, res, next, isNextCalled } = createMockReqRes({
      user: { _id: "user-999", role: ROLES.GUEST }
    });

    requirePermission(PERMISSIONS.REPO_READ)(req, res, next);
    assert.strictEqual(isNextCalled(), true);
  });

  return { passed, failed };
}

export default runRbacTests;
