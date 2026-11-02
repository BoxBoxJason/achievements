/**
 * Database lock manager for multi-instance VS Code support
 *
 * Every VS Code window runs its own extension host, and they all share the
 * same database file. sql.js keeps the whole database in memory and rewrites
 * the file on every save, so two writers would not just lose each other's
 * changes: their saves interleave on disk and leave a malformed file behind.
 * This lock guarantees a single writer; every other instance is read-only.
 *
 * The lock is a small JSON marker file in the temp directory. It is created
 * atomically and exclusively (hard link of a fully written file), so two
 * instances starting at the same time (which is exactly what happens when the
 * extension is upgraded and every window restarts its extension host) can
 * never both believe they own it.
 *
 * @namespace db_lock
 * @author BoxBoxJason
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as vscode from "vscode";
import logger from "../utils/logger";

// ================== MODULE VARIABLES ==================
let isReadOnlyMode = false;
let databasePath: string | null = null;
// Random identifier of the lock we hold (null when we do not hold it). The pid
// alone is not enough: the same extension host can activate several times.
let ownToken: string | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
// lockTime of the last marker we wrote (creation or refresh). As long as it is
// younger than LOCK_SAFE_AGE_MS, no other instance can have judged our lock
// stale, so nobody else can have written the database in the meantime.
let lastConfirmedAt = 0;
// Time source, replaceable in tests to simulate an event loop stall
let now: () => number = Date.now;

// Lock configuration
// A lock whose timestamp has not been refreshed within this window is treated as
// abandoned (e.g. left behind by an ungraceful shutdown) and can be taken over.
const LOCK_STALE_THRESHOLD_MS = 15000; // 15 seconds
// How often we rewrite our own lock timestamp so a live lock is never seen as
// stale, and re-check that we still own it (compromised-lock detection).
const LOCK_REFRESH_INTERVAL_MS = 5000; // 5 seconds
// Oldest our own marker may be for us to keep trusting it as-is. Past this
// age (e.g. after the event loop stalled or the machine slept), another
// instance may be about to take the lock over, so we renew it through the
// same exclusive protocol a takeover uses, or give it up. Kept well below
// LOCK_STALE_THRESHOLD_MS so the refresh never races a takeover.
const LOCK_SAFE_AGE_MS = 10000; // 10 seconds

// Content of the lock marker. `pID` and `lockTime` keep the format written by
// earlier versions of the extension (cross-process-lock), so an instance still
// running an older version during an upgrade keeps honouring our lock.
interface LockMetadata {
  pID: number;
  lockTime: number;
  token?: string;
}

/**
 * Database lock manager namespace
 *
 * @namespace db_lock
 * @function acquireLock - Attempts to acquire the database lock
 * @function releaseLock - Releases the database lock
 * @function isReadOnly - Returns whether the extension is in readonly mode
 * @function holdsLock - Verifies that this instance still owns the lock
 * @function getLockFilePath - Returns the lock file path for a database path
 */
export namespace db_lock {
  /**
   * Extract the errno code (ENOENT, EEXIST...) of a filesystem error.
   *
   * @param err - The caught error
   * @returns The error code, if any
   */
  function errorCode(err: unknown): string | undefined {
    return (err as { code?: string } | null)?.code;
  }

  /**
   * Get the lock file path for a given database path.
   *
   * @param dbPath - The database file path
   * @returns The lock file path
   */
  export function getLockFilePath(dbPath: string): string {
    // Use os.tmpdir() which works on all platforms (Linux, Windows, macOS)
    // and handles readOnlyRootFs scenarios better
    const tmpDir = os.tmpdir();
    // Create a unique but deterministic name based on the database path
    const dbPathHash = Buffer.from(dbPath).toString("base64url");
    return path.join(tmpDir, `achievements-db-${dbPathHash}.lock`);
  }

  /**
   * Parse lock marker contents.
   *
   * @param raw - The marker file contents
   * @returns The parsed metadata, or null if it is not a valid marker
   */
  function parseLockMetadata(raw: string): LockMetadata | null {
    try {
      const parsed = JSON.parse(raw) as Partial<LockMetadata>;
      if (
        typeof parsed?.pID === "number" &&
        typeof parsed?.lockTime === "number"
      ) {
        return {
          pID: parsed.pID,
          lockTime: parsed.lockTime,
          token: typeof parsed.token === "string" ? parsed.token : undefined,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Read and parse the lock marker at a given path.
   *
   * @param lockPath - The lock file path
   * @returns The parsed metadata, or null if it is missing or unreadable
   */
  function readLockFile(lockPath: string): LockMetadata | null {
    try {
      return parseLockMetadata(fs.readFileSync(lockPath, "utf8"));
    } catch {
      return null;
    }
  }

  /**
   * Whether a process with the given pid is still running on this machine.
   *
   * @param pid - The process id to probe
   * @returns false only when the process is known to be gone
   */
  function isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      // EPERM means the process exists but belongs to someone else
      return errorCode(err) !== "ESRCH";
    }
  }

  /**
   * Whether an existing lock marker can be taken over.
   *
   * @param lockPath - The lock file path
   * @param metadata - The parsed marker, or null if it could not be parsed
   * @returns true if the lock is abandoned
   */
  function isStale(lockPath: string, metadata: LockMetadata | null): boolean {
    const time = now();
    if (!metadata) {
      // Unparseable marker: either garbage, or an older version caught midway
      // through a (non-atomic) write. Only take it over once it is clearly old.
      try {
        return time - fs.statSync(lockPath).mtimeMs > LOCK_STALE_THRESHOLD_MS;
      } catch {
        return true;
      }
    }
    if (metadata.pID === process.pid) {
      // Left behind by an earlier activation of this same extension host
      return true;
    }
    if (time - metadata.lockTime > LOCK_STALE_THRESHOLD_MS) {
      return true;
    }
    // The owner crashed or was killed without releasing the lock (e.g. an
    // extension host shut down mid-upgrade): no need to wait for the timeout.
    return !isProcessAlive(metadata.pID);
  }

  /**
   * Write our marker to a private temporary file next to the lock file, so the
   * lock file itself only ever appears or changes with complete contents.
   *
   * @param lockPath - The lock file path
   * @param token - Our lock token
   * @returns The temporary file path and the lockTime written in it
   */
  function writeMarkerFile(
    lockPath: string,
    token: string,
  ): { tempPath: string; lockTime: number } {
    const tempPath = `${lockPath}.${token}.tmp`;
    const metadata: LockMetadata = {
      pID: process.pid,
      lockTime: now(),
      token,
    };
    fs.writeFileSync(tempPath, JSON.stringify(metadata));
    return { tempPath, lockTime: metadata.lockTime };
  }

  /**
   * Remove a file, logging instead of throwing. Used for our own temporary
   * markers: on Windows an antivirus or indexer holding the file open makes
   * the removal fail (EBUSY/EPERM), which must not undo a successful lock
   * operation.
   *
   * @param filePath - The file to remove
   */
  function removeQuietly(filePath: string): void {
    try {
      fs.rmSync(filePath, { force: true });
    } catch (err) {
      logger.debug(
        `Could not remove ${filePath}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Atomically create the lock file, failing if it already exists.
   *
   * @param lockPath - The lock file path
   * @param token - Our lock token
   * @returns true if we created the lock, false if it is already held
   */
  function tryCreateLock(lockPath: string, token: string): boolean {
    const { tempPath, lockTime } = writeMarkerFile(lockPath, token);
    let created = false;
    try {
      // link() is atomic and fails with EEXIST if the target exists, and the
      // marker is published with its full contents at once
      fs.linkSync(tempPath, lockPath);
      created = true;
    } catch (err) {
      const code = errorCode(err);
      if (code !== "EEXIST") {
        // Filesystem without hard links: fall back to an exclusive create
        // (still atomic, but the contents follow the creation)
        logger.debug(`Hard link unavailable for lock (${code}), using O_EXCL`);
        try {
          fs.writeFileSync(lockPath, fs.readFileSync(tempPath), {
            flag: "wx",
          });
          created = true;
        } catch (fallbackErr) {
          if (errorCode(fallbackErr) !== "EEXIST") {
            removeQuietly(tempPath);
            throw fallbackErr;
          }
        }
      }
    }
    // Never throw past this point: the lock may already be ours
    removeQuietly(tempPath);
    if (created) {
      lastConfirmedAt = lockTime;
    }
    return created;
  }

  /**
   * Atomically move the lock marker aside and remove it if it is the one we
   * expect, or put it back otherwise. Only one instance can move a given
   * marker away, so this is safe against concurrent takeovers and releases.
   *
   * @param lockPath - The lock file path
   * @param isExpected - Whether the moved marker is the one we meant to remove
   * @param token - Our lock token (used to name the moved-aside file)
   * @returns "removed" if the expected marker was removed, "missing" if there
   *   was no marker to move, "restored" if it was not the expected one
   */
  function moveAsideIfExpected(
    lockPath: string,
    isExpected: (moved: LockMetadata | null) => boolean,
    token: string,
  ): "removed" | "missing" | "restored" {
    const asidePath = `${lockPath}.${token}.stale`;
    try {
      // Only one instance can move a given file away
      fs.renameSync(lockPath, asidePath);
    } catch (err) {
      if (errorCode(err) === "ENOENT") {
        return "missing";
      }
      throw err;
    }

    if (isExpected(readLockFile(asidePath))) {
      removeQuietly(asidePath);
      return "removed";
    }

    // We raced with another instance and moved its lock: put it back
    try {
      fs.linkSync(asidePath, lockPath);
    } catch {
      // Someone else holds the lock now, either way it is not ours
    }
    removeQuietly(asidePath);
    return "restored";
  }

  /**
   * Remove an abandoned lock, making sure we remove the exact marker we judged
   * stale and not a fresh one another instance created in the meantime.
   *
   * @param lockPath - The lock file path
   * @param stale - The marker contents that were judged stale
   * @param token - Our lock token (used to name the moved-aside file)
   * @returns true if the stale lock is gone and creation can be retried
   */
  function removeStaleLock(
    lockPath: string,
    stale: LockMetadata | null,
    token: string,
  ): boolean {
    try {
      // "missing": someone else removed it first, creation decides who wins
      return (
        moveAsideIfExpected(
          lockPath,
          (moved) =>
            stale === null
              ? moved === null
              : moved !== null &&
                moved.pID === stale.pID &&
                moved.lockTime === stale.lockTime &&
                moved.token === stale.token,
          token,
        ) !== "restored"
      );
    } catch {
      return false;
    }
  }

  /**
   * Stop the periodic lock refresh timer, if it is running.
   */
  function stopLockRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  /**
   * Handle the lock being compromised (removed or taken over by another
   * process). Switches the extension to read-only mode.
   *
   * @param reason - Human readable description of what went wrong
   */
  function handleLockCompromised(reason: string): void {
    logger.error(`Database lock was compromised: ${reason}`);
    isReadOnlyMode = true;
    ownToken = null;
    stopLockRefresh();
    vscode.window.showWarningMessage(
      "Achievements: Database lock was lost. Switching to read-only mode.",
    );
  }

  /**
   * Verify that we still own the lock, and recover it if its marker vanished
   * (temp directory cleaners, or an older version of the extension deleting
   * markers it does not own).
   *
   * @returns true if we hold the lock
   */
  function verifyOwnership(): boolean {
    if (!databasePath || !ownToken) {
      return false;
    }
    const lockPath = getLockFilePath(databasePath);
    const metadata = readLockFile(lockPath);
    if (metadata?.token === ownToken) {
      if (now() - metadata.lockTime <= LOCK_SAFE_AGE_MS) {
        return true;
      }
      // Our marker went (nearly) stale, e.g. the event loop stalled: another
      // instance may be taking it over right now. Renew it the way a takeover
      // would (move it aside, then create a fresh one exclusively), so that
      // exactly one of us ends up with the lock.
      try {
        if (
          removeStaleLock(lockPath, metadata, ownToken) &&
          tryCreateLock(lockPath, ownToken)
        ) {
          logger.warn("Database lock had gone stale, renewed it");
          return true;
        }
      } catch (err) {
        logger.error(`Failed to renew lock: ${(err as Error).message}`);
      }
      handleLockCompromised("lock went stale and was taken over");
      return false;
    }
    if (!metadata && !fs.existsSync(lockPath)) {
      // A marker that vanished while it was fresh was deleted by a temp
      // directory cleaner or an older version of the extension: nobody else
      // can have owned the database since, so claim it again (atomically, so
      // if anyone else did in the meantime, we lose). If it was already old
      // enough to be taken over, another instance may have taken it, written
      // the database and released it: our in-memory copy is outdated and
      // writing it would erase that instance's changes.
      if (now() - lastConfirmedAt <= LOCK_SAFE_AGE_MS) {
        try {
          if (tryCreateLock(lockPath, ownToken)) {
            logger.warn("Database lock file disappeared, recreated it");
            return true;
          }
        } catch (err) {
          logger.error(`Failed to recreate lock: ${(err as Error).message}`);
        }
      }
      handleLockCompromised("lock file vanished after going stale");
      return false;
    }
    handleLockCompromised(
      metadata
        ? "lock file was taken over by another process"
        : "lock file is unreadable",
    );
    return false;
  }

  /**
   * Start the periodic task that keeps our lock alive: it verifies that we
   * still own the marker and refreshes its timestamp so a live lock is never
   * mistaken for a stale one.
   */
  function startLockRefresh(): void {
    stopLockRefresh();
    refreshTimer = setInterval(() => {
      // verifyOwnership() guarantees our marker is younger than
      // LOCK_SAFE_AGE_MS, so nobody can be taking it over: overwriting it
      // right after (synchronously) cannot replace another instance's lock.
      if (!verifyOwnership() || !databasePath || !ownToken) {
        return;
      }
      const lockPath = getLockFilePath(databasePath);
      let tempPath: string | null = null;
      try {
        const marker = writeMarkerFile(lockPath, ownToken);
        tempPath = marker.tempPath;
        // rename() replaces the marker atomically: readers never see it empty
        fs.renameSync(tempPath, lockPath);
        tempPath = null;
        lastConfirmedAt = marker.lockTime;
      } catch (err) {
        logger.warn(
          `Failed to refresh database lock timestamp: ${(err as Error).message}`,
        );
        if (tempPath) {
          removeQuietly(tempPath);
        }
      }
    }, LOCK_REFRESH_INTERVAL_MS);
    // Don't keep the extension host event loop alive just for this timer.
    refreshTimer.unref();
  }

  /**
   * Attempts to acquire an exclusive lock on the database.
   * If the lock cannot be acquired, the extension will run in readonly mode.
   *
   * @param dbPath - The path to the database file
   * @returns Promise<boolean> - true if lock acquired (write mode), false if readonly
   */
  export async function acquireLock(dbPath: string): Promise<boolean> {
    stopLockRefresh();
    databasePath = dbPath;
    ownToken = null;
    const lockPath = getLockFilePath(dbPath);
    const token = crypto.randomBytes(12).toString("hex");

    try {
      await fs.promises.mkdir(path.dirname(lockPath), { recursive: true });
      logger.debug(`Attempting to acquire database lock at: ${lockPath}`);

      let acquired = tryCreateLock(lockPath, token);
      if (!acquired) {
        const existing = readLockFile(lockPath);
        if (
          isStale(lockPath, existing) &&
          removeStaleLock(lockPath, existing, token)
        ) {
          logger.info("Taking over an abandoned database lock");
          acquired = tryCreateLock(lockPath, token);
        }
      }

      if (!acquired) {
        // Another instance has the lock
        logger.warn(
          "Another VS Code instance has the database lock - running in read-only mode",
        );
        isReadOnlyMode = true;
        vscode.window.showWarningMessage(
          "Achievements: Another VS Code instance is using the database. " +
            "This instance will run in read-only mode (achievements won't be tracked).",
        );
        return false;
      }

      ownToken = token;
      isReadOnlyMode = false;
      startLockRefresh();
      logger.info(
        "Database lock acquired successfully - running in write mode",
      );
      return true;
    } catch (err) {
      // Some other error occurred
      logger.error(`Failed to acquire database lock: ${(err as Error).message}`);
      // Default to readonly mode to be safe
      isReadOnlyMode = true;
      vscode.window.showWarningMessage(
        "Achievements: Failed to acquire database lock. Running in read-only mode.",
      );
      return false;
    }
  }

  /**
   * Releases the database lock if it was acquired. A lock owned by another
   * instance is never touched.
   *
   * @returns Promise<void>
   */
  export async function releaseLock(): Promise<void> {
    stopLockRefresh();

    if (databasePath && ownToken) {
      const token = ownToken;
      try {
        // Move the marker aside before deciding: checking it and then
        // deleting it could delete a lock another instance just took over
        if (
          moveAsideIfExpected(
            getLockFilePath(databasePath),
            (moved) => moved?.token === token,
            token,
          ) === "removed"
        ) {
          logger.info("Database lock released successfully");
        }
      } catch (err) {
        logger.error(
          `Failed to release database lock: ${(err as Error).message}`,
        );
      }
    }

    ownToken = null;
    isReadOnlyMode = false;
    databasePath = null;
  }

  /**
   * Returns whether the extension is running in read-only mode.
   *
   * In readonly mode:
   * - The database can be read but not written to
   * - Listeners should not be activated
   * - Achievements will not be tracked
   *
   * @returns boolean - true if in readonly mode
   */
  export function isReadOnly(): boolean {
    return isReadOnlyMode;
  }

  /**
   * Verify, right before writing the database, that this instance still owns
   * the lock. Switches to read-only mode if it does not.
   *
   * @returns boolean - true if it is safe to write the database
   */
  export function holdsLock(): boolean {
    return !isReadOnlyMode && verifyOwnership();
  }

  /**
   * Check if a database file is currently locked.
   * Useful for testing and diagnostics.
   *
   * @param dbPath - The database file path
   * @returns Promise<boolean> - true if locked
   */
  export async function checkLock(dbPath: string): Promise<boolean> {
    const metadata = readLockFile(getLockFilePath(dbPath));
    if (!metadata) {
      return false;
    }
    // A lock whose timestamp is older than the stale threshold is not live
    return now() - metadata.lockTime <= LOCK_STALE_THRESHOLD_MS;
  }

  /**
   * Force reset the readonly state. Used primarily for testing.
   * @internal
   */
  export function _resetState(): void {
    stopLockRefresh();
    ownToken = null;
    isReadOnlyMode = false;
    databasePath = null;
    lastConfirmedAt = 0;
    now = Date.now;
  }

  /**
   * Replace the time source, to simulate an event loop stall. Used for testing.
   * @internal
   *
   * @param clock - The new time source, or undefined to restore Date.now
   */
  export function _setClock(clock?: () => number): void {
    now = clock ?? Date.now;
  }

  /**
   * Expose the takeover's move-aside step. Used for testing.
   * @internal
   */
  export const _removeStaleLock = removeStaleLock;
}
