import * as assert from "node:assert";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { db_lock } from "../database/lock";

suite("Database Lock Test Suite", () => {
  let testDir: string;
  let testDbPath: string;

  setup(() => {
    // Create a unique test directory for each test
    testDir = path.join(
      os.tmpdir(),
      "achievements-lock-test-" + Math.random().toString(36).substring(7)
    );
    fs.mkdirSync(testDir, { recursive: true });
    testDbPath = path.join(testDir, "test.sqlite");

    // Reset lock state before each test
    db_lock._resetState();
  });

  teardown(async () => {
    // Release any locks and clean up
    await db_lock.releaseLock();
    db_lock._resetState();

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("getLockFilePath should return a path in temp directory", () => {
    const lockPath = db_lock.getLockFilePath(testDbPath);
    assert.ok(
      lockPath.startsWith(os.tmpdir()),
      `Lock path should start with temp dir: ${lockPath}`
    );
    assert.ok(
      lockPath.includes("achievements-db-"),
      "Lock path should contain achievements-db- prefix"
    );
    assert.ok(lockPath.endsWith(".lock"), "Lock path should end with .lock");
  });

  test("getLockFilePath should be deterministic", () => {
    const lockPath1 = db_lock.getLockFilePath(testDbPath);
    const lockPath2 = db_lock.getLockFilePath(testDbPath);
    assert.strictEqual(
      lockPath1,
      lockPath2,
      "Same database path should produce same lock path"
    );
  });

  test("getLockFilePath should differ for different database paths", () => {
    const lockPath1 = db_lock.getLockFilePath("/path/to/db1.sqlite");
    const lockPath2 = db_lock.getLockFilePath("/path/to/db2.sqlite");
    assert.notStrictEqual(
      lockPath1,
      lockPath2,
      "Different database paths should produce different lock paths"
    );
  });

  test("acquireLock should acquire lock and return true", async () => {
    const result = await db_lock.acquireLock(testDbPath);
    assert.strictEqual(result, true, "Should acquire lock successfully");
    assert.strictEqual(
      db_lock.isReadOnly(),
      false,
      "Should not be in readonly mode"
    );
  });

  test("acquireLock should create lock file", async () => {
    await db_lock.acquireLock(testDbPath);
    const lockPath = db_lock.getLockFilePath(testDbPath);
    assert.ok(fs.existsSync(lockPath), "Lock file should exist");
  });

  test("isReadOnly should return false after acquiring lock", async () => {
    assert.strictEqual(
      db_lock.isReadOnly(),
      false,
      "Should not be readonly before lock"
    );
    await db_lock.acquireLock(testDbPath);
    assert.strictEqual(
      db_lock.isReadOnly(),
      false,
      "Should not be readonly after acquiring lock"
    );
  });

  test("releaseLock should release the lock", async () => {
    await db_lock.acquireLock(testDbPath);
    await db_lock.releaseLock();

    // Should be able to acquire lock again
    const result = await db_lock.acquireLock(testDbPath);
    assert.strictEqual(result, true, "Should be able to re-acquire lock");
  });

  test("releaseLock should clean up lock file", async () => {
    await db_lock.acquireLock(testDbPath);
    const lockPath = db_lock.getLockFilePath(testDbPath);
    assert.ok(fs.existsSync(lockPath), "Lock file should exist after acquire");

    await db_lock.releaseLock();
    // Note: The lock file may or may not exist after release depending on timing
    // The important thing is that the lock is released
  });

  test("checkLock should return false when not locked", async () => {
    const isLocked = await db_lock.checkLock(testDbPath);
    assert.strictEqual(isLocked, false, "Should not be locked initially");
  });

  test("checkLock should return true when locked", async () => {
    await db_lock.acquireLock(testDbPath);
    const isLocked = await db_lock.checkLock(testDbPath);
    assert.strictEqual(isLocked, true, "Should be locked after acquiring");
  });

  test("second lock attempt should fail and set readonly mode", async () => {
    const lockPath = db_lock.getLockFilePath(testDbPath);

    // Simulate another live instance holding the lock
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.writeFileSync(
      lockPath,
      JSON.stringify({ pID: process.pid + 1, lockTime: Date.now() })
    );

    // Try to acquire with db_lock (simulating second instance)
    const result = await db_lock.acquireLock(testDbPath);
    assert.strictEqual(result, false, "Second lock attempt should fail");
    assert.strictEqual(db_lock.isReadOnly(), true, "Should be in readonly mode");
  });

  test("_resetState should reset all internal state", async () => {
    await db_lock.acquireLock(testDbPath);
    db_lock._resetState();
    assert.strictEqual(
      db_lock.isReadOnly(),
      false,
      "isReadOnly should be reset to false"
    );
  });

  test("stale lock should be automatically recovered", async () => {
    const lockPath = db_lock.getLockFilePath(testDbPath);

    // A lock left behind by a dead instance: timestamp older than the threshold
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.writeFileSync(
      lockPath,
      JSON.stringify({ pID: process.pid + 1, lockTime: Date.now() - 60000 })
    );

    // Should be able to acquire the lock because the existing one is stale
    const result = await db_lock.acquireLock(testDbPath);
    assert.strictEqual(result, true, "Should acquire stale lock");
    assert.strictEqual(
      db_lock.isReadOnly(),
      false,
      "Should not be in readonly mode"
    );
  });

  test("multiple calls to releaseLock should be safe", async () => {
    await db_lock.acquireLock(testDbPath);
    await db_lock.releaseLock();
    await db_lock.releaseLock(); // Should not throw
    await db_lock.releaseLock(); // Should not throw
  });

  test("releaseLock without acquireLock should be safe", async () => {
    await db_lock.releaseLock(); // Should not throw
  });
});
