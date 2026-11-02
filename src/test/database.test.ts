import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import { db_model } from "../database/model/model";
import { db_lock } from "../database/lock";
import initSqlJs from "sql.js";
import { getMockContext, cleanupMockContext } from "./utils";

suite("Database Model Test Suite", () => {
  let context: vscode.ExtensionContext;
  let dbPath: string;

  setup(async () => {
    context = getMockContext();
    dbPath = path.join(context.globalStorageUri.fsPath, "test.sqlite");
    // Reset lock state before each test
    db_lock._resetState();
    db_model._resetState();
  });

  const tempFiles = () =>
    fs
      .readdirSync(path.dirname(dbPath))
      .filter(
        (name) =>
          name.startsWith(`${path.basename(dbPath)}.`) && name.endsWith(".tmp"),
      );

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

    const all = db_model.getAll<{ id: number; name: string }>(
      db,
      "SELECT * FROM test",
    );
    assert.strictEqual(all.length, 2);
    assert.strictEqual(all[0].name, "test1");
    assert.strictEqual(all[1].name, "test2");

    const one = db_model.get<{ id: number; name: string }>(
      db,
      "SELECT * FROM test WHERE id = ?",
      [1],
    );
    assert.ok(one, "Expected one row from test query");
    assert.strictEqual(one.name, "test1");
  });

  test("activate should recover from a corrupted database file", async () => {
    // Build a valid database, then truncate it the way an interrupted write
    // would (the extension used to fail activation forever afterwards, taking
    // every command and listener down with it)
    await db_model.activate(context, dbPath);
    await db_model.deactivate();
    db_lock._resetState();
    db_model._resetState();

    const originalSize = fs.statSync(dbPath).size;
    fs.truncateSync(dbPath, Math.floor(originalSize / 2));

    const hasWriteAccess = await db_model.activate(context, dbPath);

    assert.strictEqual(hasWriteAccess, true, "Should have write access");
    const db = await db_model.getDB();
    assert.strictEqual(
      db_model.getAll<{ quick_check: string }>(db, "PRAGMA quick_check")[0]
        .quick_check,
      "ok",
      "Rebuilt database should be readable",
    );

    const backups = fs
      .readdirSync(path.dirname(dbPath))
      .filter((name) => name.startsWith(`${path.basename(dbPath)}.corrupted-`));
    assert.strictEqual(
      backups.length,
      1,
      "Corrupted database should have been kept aside",
    );
  });

  test("saveDB should not leave a partial database behind on failure", async () => {
    await db_model.activate(context, dbPath);
    await db_model.saveDB();

    const saved = fs.readFileSync(dbPath);
    assert.ok(saved.length > 0, "Database file should not be empty");
    assert.deepStrictEqual(
      tempFiles(),
      [],
      "Temporary save file should have been renamed away",
    );
  });

  test("overlapping saves should be serialized and keep the file valid", async () => {
    await db_model.activate(context, dbPath);
    const db = await db_model.getDB();
    db.run("CREATE TABLE overlap (id INTEGER PRIMARY KEY, name TEXT)");

    // Count the saves in flight between opening their temporary file and
    // renaming it over the database
    const { open, rename } = fs.promises;
    let inFlight = 0;
    let maxInFlight = 0;
    fs.promises.open = (async (...args: Parameters<typeof open>) => {
      const handle = await open(...args);
      if (String(args[0]).endsWith(".tmp")) {
        maxInFlight = Math.max(maxInFlight, ++inFlight);
      }
      return handle;
    }) as typeof open;
    fs.promises.rename = (async (...args: Parameters<typeof rename>) => {
      try {
        return await rename(...args);
      } finally {
        if (String(args[0]).endsWith(".tmp")) {
          inFlight--;
        }
      }
    }) as typeof rename;
    try {
      const saves: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        db.run("INSERT INTO overlap (name) VALUES (?)", [`row${i}`]);
        saves.push(db_model.saveDB());
        // Let the previous save start before queuing the next one
        await new Promise((resolve) => setImmediate(resolve));
      }
      await Promise.all(saves);
    } finally {
      fs.promises.open = open;
      fs.promises.rename = rename;
    }
    assert.strictEqual(maxInFlight, 1, "Saves must never overlap");

    assert.deepStrictEqual(tempFiles(), [], "No temporary file left behind");
    const reopened = new (await initSqlJs()).Database(fs.readFileSync(dbPath));
    try {
      assert.strictEqual(
        reopened.exec("PRAGMA quick_check")[0].values[0][0],
        "ok",
      );
      assert.strictEqual(
        reopened.exec("SELECT COUNT(*) FROM overlap")[0].values[0][0],
        10,
        "The last save should contain every row",
      );
    } finally {
      reopened.close();
    }
  });

  test("saveDB should not write once another instance took the lock", async () => {
    await db_model.activate(context, dbPath);
    await db_model.saveDB();
    const before = fs.readFileSync(dbPath);

    // Another instance now owns the database
    fs.writeFileSync(
      db_lock.getLockFilePath(dbPath),
      JSON.stringify({ pID: process.ppid, lockTime: Date.now() }),
    );
    const db = await db_model.getDB();
    db.run("CREATE TABLE intruder (id INTEGER)");
    await db_model.saveDB();

    assert.ok(
      before.equals(fs.readFileSync(dbPath)),
      "The database file must not be rewritten without the lock",
    );
    assert.strictEqual(db_lock.isReadOnly(), true, "Should be read-only now");
    fs.rmSync(db_lock.getLockFilePath(dbPath), { force: true });
  });

  test("saveDB should not replace the file if the lock is lost mid-save", async () => {
    await db_model.activate(context, dbPath);
    await db_model.saveDB();
    const before = fs.readFileSync(dbPath);
    const db = await db_model.getDB();
    db.run("CREATE TABLE late (id INTEGER)");

    // Another instance takes the lock over while the save is being written
    const { open } = fs.promises;
    fs.promises.open = (async (...args: Parameters<typeof open>) => {
      const handle = await open(...args);
      fs.writeFileSync(
        db_lock.getLockFilePath(dbPath),
        JSON.stringify({ pID: process.ppid, lockTime: Date.now() }),
      );
      return handle;
    }) as typeof open;
    try {
      await db_model.saveDB();
    } finally {
      fs.promises.open = open;
    }

    assert.ok(before.equals(fs.readFileSync(dbPath)), "File left untouched");
    assert.deepStrictEqual(tempFiles(), [], "Temporary file cleaned up");
    assert.strictEqual(db_lock.isReadOnly(), true);
    fs.rmSync(db_lock.getLockFilePath(dbPath), { force: true });
  });

  test("a read-only window should leave an unreadable database file alone", async () => {
    fs.writeFileSync(dbPath, "not a database");
    // Another instance holds the lock
    fs.writeFileSync(
      db_lock.getLockFilePath(dbPath),
      JSON.stringify({ pID: process.ppid, lockTime: Date.now() }),
    );
    try {
      assert.strictEqual(await db_model.activate(context, dbPath), false);
      assert.strictEqual(
        fs.readFileSync(dbPath, "utf8"),
        "not a database",
        "Only the writer may quarantine the file",
      );
      assert.deepStrictEqual(
        fs
          .readdirSync(path.dirname(dbPath))
          .filter((name) => name.includes(".corrupted-")),
        [],
      );
    } finally {
      fs.rmSync(db_lock.getLockFilePath(dbPath), { force: true });
    }
  });

  test("activate should release the lock if it fails", async () => {
    // Reading the database file fails (here: it is a directory)
    fs.mkdirSync(dbPath);
    await assert.rejects(db_model.activate(context, dbPath));
    assert.strictEqual(
      fs.existsSync(db_lock.getLockFilePath(dbPath)),
      false,
      "Another window must be able to take the lock",
    );
  });

  test("activate should remove abandoned temporary save files", async () => {
    const stale = `${dbPath}.12345-abcdef.tmp`;
    fs.writeFileSync(stale, "partial");
    const old = new Date(Date.now() - 10 * 60 * 1000);
    fs.utimesSync(stale, old, old);

    await db_model.activate(context, dbPath);
    assert.strictEqual(fs.existsSync(stale), false);
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
      "Lock should be released after deactivate",
    );
  });
});
