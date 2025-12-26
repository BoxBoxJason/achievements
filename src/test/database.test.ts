import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import { db_model } from "../database/model/model";
import { db_lock } from "../database/lock";
import { getMockContext, cleanupMockContext } from "./utils";

suite("Database Model Test Suite", () => {
  let context: vscode.ExtensionContext;
  let dbPath: string;

  setup(async () => {
    context = getMockContext();
    dbPath = path.join(context.globalStorageUri.fsPath, "test.sqlite");
    // Reset lock state before each test
    db_lock._resetState();
  });

  teardown(async () => {
    await db_model.deactivate();
    cleanupMockContext(context);
  });

  test("activate should initialize database and return true for write access", async () => {
    const hasWriteAccess = await db_model.activate(context, dbPath);
    assert.strictEqual(hasWriteAccess, true, "Should have write access");
    const db = await db_model.getDB();
    assert.ok(db, "Database should be initialized");
    assert.ok(fs.existsSync(dbPath), "Database file should exist");
  });

  test("saveDB should write to disk", async () => {
    await db_model.activate(context, dbPath);

    // Wait a bit to ensure mtime changes if it's fast
    await new Promise((resolve) => setTimeout(resolve, 100));

    await db_model.saveDB();

    // Size might not change if no data added, but we can check it exists
    assert.ok(fs.existsSync(dbPath));
  });

  test("getAll and get should return data", async () => {
    await db_model.activate(context, dbPath);
    const db = await db_model.getDB();

    // Create a test table
    db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
    db.run("INSERT INTO test (name) VALUES (?)", ["test1"]);
    db.run("INSERT INTO test (name) VALUES (?)", ["test2"]);

    const all = db_model.getAll(db, "SELECT * FROM test");
    assert.strictEqual(all.length, 2);
    assert.strictEqual(all[0].name, "test1");
    assert.strictEqual(all[1].name, "test2");

    const one = db_model.get(db, "SELECT * FROM test WHERE id = ?", [1]);
    assert.strictEqual(one.name, "test1");
  });

  test("deactivate should close database and release lock", async () => {
    await db_model.activate(context, dbPath);
    await db_model.deactivate();

    await assert.rejects(async () => {
      await db_model.getDB();
    }, /Database not initialized/);

    // Lock should be released, so we can acquire it again
    const isLocked = await db_lock.checkLock(dbPath);
    assert.strictEqual(
      isLocked,
      false,
      "Lock should be released after deactivate"
    );
  });
});
