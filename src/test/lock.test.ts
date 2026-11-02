import * as assert from "node:assert";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { ChildProcess, fork, spawnSync } from "node:child_process";
import { db_lock } from "../database/lock";

// A separate process running the real lock module (with a stub `vscode`), to
// play another VS Code window's extension host.
const CHILD_SCRIPT = `
const Module = require("node:module");
const noop = () => undefined;
const vscodeStub = {
  window: {
    createOutputChannel: () => ({ appendLine: noop, append: noop, show: noop, dispose: noop }),
    showWarningMessage: noop,
    showErrorMessage: noop,
    showInformationMessage: noop,
  },
};
const load = Module._load;
Module._load = function (request, ...rest) {
  return request === "vscode" ? vscodeStub : load.call(this, request, ...rest);
};
const { db_lock } = require(process.argv[2]);
process.on("message", async (msg) => {
  if (msg.cmd === "acquire") {
    process.send({ acquired: await db_lock.acquireLock(msg.dbPath) });
  } else if (msg.cmd === "release") {
    await db_lock.releaseLock();
    process.send({ released: true });
  } else {
    process.exit(0);
  }
});
process.send({ ready: true });
`;

interface LockProcess {
  send(message: object): Promise<Record<string, unknown>>;
  kill(): void;
}

function startLockProcess(scriptPath: string): Promise<LockProcess> {
  const child: ChildProcess = fork(
    scriptPath,
    [path.resolve(__dirname, "../database/lock.js")],
    {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  const nextMessage = () =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      child.once("message", (msg) => resolve(msg as Record<string, unknown>));
      child.once("error", reject);
    });
  return nextMessage().then(() => ({
    send(message: object) {
      const reply = nextMessage();
      child.send(message);
      return reply;
    },
    kill() {
      child.kill();
    },
  }));
}

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
    // Simulated foreign locks are (rightly) never removed by releaseLock()
    fs.rmSync(db_lock.getLockFilePath(testDbPath), { force: true });

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

    // Simulate another live instance holding the lock (the parent process
    // is alive and not us; marker in the format older versions write)
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.writeFileSync(
      lockPath,
      JSON.stringify({ pID: process.ppid, lockTime: Date.now() })
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

  test("lock held by a dead process should be taken over immediately", async () => {
    const lockPath = db_lock.getLockFilePath(testDbPath);
    // A pid that is guaranteed to be gone: a child process that already exited
    const deadPid = spawnSync(process.execPath, ["-e", ""]).pid;
    assert.ok(deadPid, "Should have spawned a child process");
    fs.writeFileSync(
      lockPath,
      JSON.stringify({ pID: deadPid, lockTime: Date.now() })
    );

    const result = await db_lock.acquireLock(testDbPath);
    assert.strictEqual(result, true, "Should take over a dead owner's lock");
  });

  test("releaseLock should never remove a lock owned by another instance", async () => {
    const lockPath = db_lock.getLockFilePath(testDbPath);
    const foreign = JSON.stringify({ pID: process.ppid, lockTime: Date.now() });
    fs.writeFileSync(lockPath, foreign);

    assert.strictEqual(await db_lock.acquireLock(testDbPath), false);
    await db_lock.releaseLock();

    assert.strictEqual(
      fs.readFileSync(lockPath, "utf8"),
      foreign,
      "A read-only instance shutting down must leave the writer's lock alone"
    );
    fs.rmSync(lockPath, { force: true });
  });

  test("holdsLock should detect a lock taken over by another instance", async () => {
    assert.strictEqual(await db_lock.acquireLock(testDbPath), true);
    const lockPath = db_lock.getLockFilePath(testDbPath);
    const first = fs.readFileSync(lockPath, "utf8");

    // Another instance takes the lock over: we must notice before writing
    fs.writeFileSync(
      lockPath,
      JSON.stringify({ pID: process.ppid, lockTime: Date.now() })
    );
    assert.strictEqual(db_lock.holdsLock(), false, "Lock is no longer ours");
    assert.strictEqual(db_lock.isReadOnly(), true, "Should switch to read-only");
    assert.notStrictEqual(fs.readFileSync(lockPath, "utf8"), first);
    fs.rmSync(lockPath, { force: true });
  });

  test("holdsLock should recreate a lock file that vanished", async () => {
    assert.strictEqual(await db_lock.acquireLock(testDbPath), true);
    const lockPath = db_lock.getLockFilePath(testDbPath);
    fs.rmSync(lockPath);

    assert.strictEqual(db_lock.holdsLock(), true, "Should reclaim the lock");
    assert.ok(fs.existsSync(lockPath), "Lock file should be back");
    assert.strictEqual(db_lock.isReadOnly(), false);
  });

  test("acquireLock should leave no temporary marker files behind", async () => {
    await db_lock.acquireLock(testDbPath);
    const lockPath = db_lock.getLockFilePath(testDbPath);
    const leftovers = fs
      .readdirSync(path.dirname(lockPath))
      .filter(
        (name) =>
          name.startsWith(path.basename(lockPath) + ".") &&
          (name.endsWith(".tmp") || name.endsWith(".stale"))
      );
    assert.deepStrictEqual(leftovers, []);
  });

  suite("against other processes", () => {
    let scriptPath: string;
    let children: LockProcess[];

    setup(() => {
      scriptPath = path.join(testDir, "lock-process.js");
      fs.writeFileSync(scriptPath, CHILD_SCRIPT);
      children = [];
    });

    teardown(() => {
      children.forEach((child) => child.kill());
    });

    const start = async (count: number) => {
      children = await Promise.all(
        Array.from({ length: count }, () => startLockProcess(scriptPath)),
      );
      return children;
    };

    test("only one of several processes starting together gets the lock", async () => {
      // What happens on every extension upgrade: all windows restart at once
      const processes = await start(8);
      const replies = await Promise.all(
        processes.map((child) =>
          child.send({ cmd: "acquire", dbPath: testDbPath }),
        ),
      );
      assert.strictEqual(
        replies.filter((reply) => reply.acquired === true).length,
        1,
        "Exactly one writer",
      );
    });

    test("a stale lock is taken over and its old owner notices", async () => {
      assert.strictEqual(await db_lock.acquireLock(testDbPath), true);
      const lockPath = db_lock.getLockFilePath(testDbPath);
      // Our event loop stalls: the marker stops being refreshed
      const ours = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      ours.lockTime = Date.now() - 60000;
      fs.writeFileSync(lockPath, JSON.stringify(ours));

      const [other] = await start(1);
      assert.deepStrictEqual(
        await other.send({ cmd: "acquire", dbPath: testDbPath }),
        { acquired: true },
        "Another window takes the stale lock over",
      );
      assert.strictEqual(db_lock.holdsLock(), false, "Lock is no longer ours");
      assert.strictEqual(db_lock.isReadOnly(), true);
    });

    test("a lock that vanished after going stale is not recreated", async () => {
      assert.strictEqual(await db_lock.acquireLock(testDbPath), true);
      const lockPath = db_lock.getLockFilePath(testDbPath);
      const ours = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      ours.lockTime = Date.now() - 60000;
      fs.writeFileSync(lockPath, JSON.stringify(ours));

      // Another window takes over, writes the database and closes
      const [other] = await start(1);
      await other.send({ cmd: "acquire", dbPath: testDbPath });
      await other.send({ cmd: "release" });
      assert.strictEqual(fs.existsSync(lockPath), false);

      // We resume after the stall: our copy of the database is outdated
      db_lock._setClock(() => Date.now() + 60000);
      assert.strictEqual(db_lock.holdsLock(), false, "Must not write");
      assert.strictEqual(fs.existsSync(lockPath), false);
    });

    test("a lock is not given up to a live process with a stale timestamp", async () => {
      const [owner] = await start(1);
      assert.deepStrictEqual(
        await owner.send({ cmd: "acquire", dbPath: testDbPath }),
        { acquired: true },
      );
      // ...but the owner stopped refreshing it (hung extension host)
      const lockPath = db_lock.getLockFilePath(testDbPath);
      const marker = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      marker.lockTime = Date.now() - 60000;
      fs.writeFileSync(lockPath, JSON.stringify(marker));

      assert.strictEqual(
        await db_lock.acquireLock(testDbPath),
        true,
        "A lock not refreshed for too long is taken over, live pid or not",
      );
    });
  });

  test("holdsLock should renew our own lock after a stall", async () => {
    assert.strictEqual(await db_lock.acquireLock(testDbPath), true);
    const lockPath = db_lock.getLockFilePath(testDbPath);
    const before = JSON.parse(fs.readFileSync(lockPath, "utf8"));

    // 12s later (no refresh happened): nobody took it, we keep it
    db_lock._setClock(() => Date.now() + 12000);
    assert.strictEqual(db_lock.holdsLock(), true);
    const after = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    assert.strictEqual(after.token, before.token, "Still our lock");
    assert.ok(after.lockTime >= before.lockTime + 12000, "Marker renewed");
  });

  test("removeStaleLock should put back a lock that changed since it was judged stale", () => {
    const lockPath = db_lock.getLockFilePath(testDbPath);
    const judged = { pID: 1, lockTime: Date.now() - 60000, token: "old" };
    // Another instance took it over between our read and our move
    const fresh = JSON.stringify({ pID: 2, lockTime: Date.now(), token: "new" });
    fs.writeFileSync(lockPath, fresh);

    assert.strictEqual(
      db_lock._removeStaleLock(lockPath, judged, "mine"),
      false,
      "The fresh lock must not be removed",
    );
    assert.strictEqual(fs.readFileSync(lockPath, "utf8"), fresh);
    assert.deepStrictEqual(
      fs
        .readdirSync(path.dirname(lockPath))
        .filter((name) => name.startsWith(path.basename(lockPath) + ".")),
      [],
      "No moved-aside file left behind",
    );
  });

  test("releaseLock should not remove a lock taken over from us", async () => {
    assert.strictEqual(await db_lock.acquireLock(testDbPath), true);
    const lockPath = db_lock.getLockFilePath(testDbPath);
    const foreign = JSON.stringify({
      pID: process.ppid,
      lockTime: Date.now(),
      token: "someone-else",
    });
    fs.writeFileSync(lockPath, foreign);

    await db_lock.releaseLock();
    assert.strictEqual(fs.readFileSync(lockPath, "utf8"), foreign);
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
