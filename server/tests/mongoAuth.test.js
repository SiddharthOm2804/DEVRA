import assert from "node:assert";
import mongoose from "mongoose";
import crypto from "node:crypto";
import User from "../src/models/User.js";
import { config } from "../src/config/env.js";

/**
 * Real MongoDB Authentication & User Lifecycle Verification Suite
 * Operates against an isolated test database (devra_test_auth)
 */
export async function runMongoAuthIntegrationTests() {
  console.log("\n=========================================");
  console.log("  DEVRA Real MongoDB Authentication Tests ");
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

  const testDbUri = process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/devra_test_auth";

  try {
    await mongoose.connect(testDbUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`  [Setup] Connected to isolated test database: ${testDbUri}`);
  } catch (err) {
    console.warn(`  [Notice] MongoDB connection could not be established at ${testDbUri}: ${err.message}`);
    console.warn("  [Notice] Skipping real MongoDB integration tests (blocked by database accessibility).");
    return { passed: 0, failed: 0, skipped: true, reason: err.message };
  }

  // Ensure clean test collection
  await User.deleteMany({ email: { $regex: /@devra-test\.local$/ } });

  const testEmail = `engineer_${Date.now()}@devra-test.local`;
  const rawPassword = "StrongPassword_2026!";
  let createdUserId = null;

  try {
    // 1. User Registration & Password Hashing in MongoDB
    await test("Persists registered user with bcrypt hash rather than plaintext in MongoDB", async () => {
      const user = await User.create({
        name: "Test Engineer",
        email: testEmail,
        password: rawPassword,
        role: "developer"
      });

      assert.ok(user._id);
      createdUserId = user._id;

      // Query raw document from collection to inspect stored password field
      const rawDoc = await mongoose.connection.collection("users").findOne({ _id: user._id });
      assert.ok(rawDoc);
      assert.notStrictEqual(rawDoc.password, rawPassword);
      assert.ok(rawDoc.password.startsWith("$2a$") || rawDoc.password.startsWith("$2b$"));
    });

    // 2. Authentication & Bcrypt Verification
    await test("Authenticates valid credentials and rejects incorrect passwords via MongoDB lookup", async () => {
      const user = await User.findOne({ email: testEmail }).select("+password");
      assert.ok(user);

      const isValid = await user.comparePassword(rawPassword);
      assert.strictEqual(isValid, true);

      const isInvalid = await user.comparePassword("WrongPassword123!");
      assert.strictEqual(isInvalid, false);
    });

    // 3. Serialization Security (Password & GitHub token redacted)
    await test("toJSON serialization redacts password and githubAccessToken safely", async () => {
      const user = await User.findOne({ email: testEmail });
      const serialized = user.toJSON();

      assert.strictEqual(serialized.password, undefined);
      assert.strictEqual(serialized.githubAccessToken, undefined);
      assert.strictEqual(serialized.email, testEmail);
    });

    // 4. Duplicate Account Protection (Unique Index enforcement)
    await test("MongoDB unique index rejects duplicate email registration", async () => {
      let duplicateThrew = false;
      try {
        await User.create({
          name: "Duplicate User",
          email: testEmail,
          password: "AnotherPassword123!"
        });
      } catch (err) {
        duplicateThrew = true;
        assert.ok(err.code === 11000 || err.message.includes("duplicate"));
      }
      assert.strictEqual(duplicateThrew, true);
    });

    // 5. Password Reset Token Workflow in MongoDB
    await test("Stores hashed reset token and updates password upon reset", async () => {
      const user = await User.findOne({ email: testEmail });
      assert.ok(user);

      const rawResetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawResetToken).digest("hex");

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      // Verify token is in DB
      const userWithToken = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      assert.ok(userWithToken);

      // Perform reset
      const newPassword = "NewlyResetPassword_2026!";
      userWithToken.password = newPassword;
      userWithToken.resetPasswordToken = null;
      userWithToken.resetPasswordExpire = null;
      await userWithToken.save();

      // Verify old password fails and new password succeeds
      const refreshedUser = await User.findById(createdUserId).select("+password");
      assert.strictEqual(await refreshedUser.comparePassword(rawPassword), false);
      assert.strictEqual(await refreshedUser.comparePassword(newPassword), true);
      assert.strictEqual(refreshedUser.resetPasswordToken, null);
    });

    // 6. Tenant & User Isolation
    await test("Prevents data cross-talk between distinct user accounts", async () => {
      const otherEmail = `engineer_other_${Date.now()}@devra-test.local`;
      const otherUser = await User.create({
        name: "Second Engineer",
        email: otherEmail,
        password: "OtherPassword123!",
        role: "developer"
      });

      assert.notStrictEqual(otherUser._id.toString(), createdUserId.toString());
      const queryResult = await User.findOne({ email: otherEmail });
      assert.strictEqual(queryResult.email, otherEmail);
      assert.notStrictEqual(queryResult.email, testEmail);

      await User.deleteOne({ _id: otherUser._id });
    });

  } finally {
    // Cleanup synthetic test records
    await User.deleteMany({ email: { $regex: /@devra-test\.local$/ } });
    await mongoose.disconnect();
    console.log("  [Teardown] Disconnected from test database and cleaned up synthetic records.\n");
  }

  return { passed, failed };
}
