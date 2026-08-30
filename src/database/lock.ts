/**
 * Database lock manager for multi-instance VS Code support
 *
 * This module handles file locking to prevent data corruption when multiple
 * VS Code instances access the same database file.
 *
 * @namespace db_lock
 * @author BoxBoxJason
 */

import { lock as acquireFileLock, LockError } from "cross-process-lock";
import type { UnlockFunction } from "cross-process-lock";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as vscode from "vscode";
import logger from "../utils/logger";

// ================== MODULE VARIABLES ==================
let lockRelease: UnlockFunction | null = null;
let isReadOnlyMode = false;
let databasePath: string | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// Lock configuration
// A lock whose timestamp has not been refreshed within this window is treated as
// abandoned (e.g. left behind by an ungraceful shutdown) and can be taken over.
const LOCK_STALE_THRESHOLD_MS = 15000; // 15 seconds
// How often we rewrite our own lock timestamp so a live lock is never seen as
// stale, and re-check that we still own it (compromised-lock detection).
const LOCK_REFRESH_INTERVAL_MS = 5000; // 5 seconds
// cross-process-lock retries every 500ms until this budget elapses. Keeping it
// below one retry interval means a single acquisition attempt: if another
// instance holds the lock we fall straight through to read-only mode.
const LOCK_ACQUIRE_TIMEOUT_MS = 250;

// Shape of the metadata cross-process-lock writes into its lock file. We rewrite
// it ourselves on every refresh so the format has to stay in sync.
interface LockMetadata {
  pID: number;
  lockTime: number;
}

/**
 * Database lock manager namespace
 *
 * @namespace db_lock
 * @function acquireLock - Attempts to acquire the database lock
 * @function releaseLock - Releases the database lock
 * @function isReadOnly - Returns whether the extension is in readonly mode
 * @function getLockFilePath - Returns the lock file path for a database path
 */
export namespace db_lock {
  /**
   * Get the path of the file cross-process-lock guards for a given database.
   * This file only needs to exist; the actual lock marker is created next to it
   * with a ".lock" suffix (see getLockFilePath).
   *
   * @param dbPath - The database file path
   * @returns The lock target path
   */
  function getLockTargetPath(dbPath: string): string {
    // Use os.tmpdir() which works on all platforms (Linux, Windows, macOS)
    // and handles readOnlyRootFs scenarios better
    const tmpDir = os.tmpdir();
    // Create a unique but deterministic name based on the database path
    const dbPathHash = Buffer.from(dbPath).toString("base64url");
    return path.join(tmpDir, `achievements-db-${dbPathHash}`);
  }

  /**
   * Get the lock file path for a given database path.
   * This is the marker file cross-process-lock creates while the lock is held.
   *
   * @param dbPath - The database file path
   * @returns The lock file path
   */
  export function getLockFilePath(dbPath: string): string {
    return `${getLockTargetPath(dbPath)}.lock`;
  }

  /**
   * Read and parse the lock marker for a database path.
   *
   * @param dbPath - The database file path
   * @returns The parsed metadata, or null if it is missing or unreadable
   */
  function readLockMetadata(dbPath: string): LockMetadata | null {
    try {
      const raw = fs.readFileSync(getLockFilePath(dbPath), "utf8");
      const parsed = JSON.parse(raw) as Partial<LockMetadata>;
      if (
        typeof parsed?.pID === "number" &&
        typeof parsed?.lockTime === "number"
      ) {
        return { pID: parsed.pID, lockTime: parsed.lockTime };
      }
      return null;
    } catch {
      return null;
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
    lockRelease = null;
    stopLockRefresh();
    vscode.window.showWarningMessage(
      "Achievements: Database lock was lost. Switching to read-only mode."
    );
  }

  /**
   * Start the periodic task that keeps our lock alive: it refreshes the lock
   * timestamp so a live lock is never mistaken for a stale one, and verifies
   * that we still own the marker (cross-process-lock has no onCompromised hook).
   *
   * @param dbPath - The database file path
   */
  function startLockRefresh(dbPath: string): void {
    stopLockRefresh();
    const markerPath = getLockFilePath(dbPath);
    refreshTimer = setInterval(() => {
      const metadata = readLockMetadata(dbPath);
      if (!metadata) {
        handleLockCompromised("lock file is missing or unreadable");
        return;
      }
      if (metadata.pID !== process.pid) {
        handleLockCompromised("lock file was taken over by another process");
        return;
      }
      try {
        fs.writeFileSync(
          markerPath,
          JSON.stringify({ pID: process.pid, lockTime: Date.now() })
        );
      } catch (err) {
        logger.warn(
          `Failed to refresh database lock timestamp: ${(err as Error).message}`
        );
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
    databasePath = dbPath;
    const targetPath = getLockTargetPath(dbPath);

    try {
      // Ensure the lock directory exists
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

      // cross-process-lock requires the target file to exist before locking it
      if (!fs.existsSync(targetPath)) {
        await fs.promises.writeFile(targetPath, "", { flag: "w" });
      }

      logger.debug(`Attempting to acquire database lock at: ${targetPath}`);

      lockRelease = await acquireFileLock(targetPath, {
        // A lock older than this is considered stale and can be stolen
        lockTimeout: LOCK_STALE_THRESHOLD_MS,
        // Effectively a single attempt before falling back to read-only mode
        waitTimeout: LOCK_ACQUIRE_TIMEOUT_MS,
      });

      startLockRefresh(dbPath);

      isReadOnlyMode = false;
      logger.info(
        "Database lock acquired successfully - running in write mode"
      );
      return true;
    } catch (err) {
      stopLockRefresh();
      const error = err as Error;

      if (error instanceof LockError) {
        // Another instance has the lock
        logger.warn(
          "Another VS Code instance has the database lock - running in read-only mode"
        );
        isReadOnlyMode = true;
        vscode.window.showWarningMessage(
          "Achievements: Another VS Code instance is using the database. " +
            "This instance will run in read-only mode (achievements won't be tracked)."
        );
        return false;
      }

      // Some other error occurred
      logger.error(`Failed to acquire database lock: ${error.message}`);
      // Default to readonly mode to be safe
      isReadOnlyMode = true;
      vscode.window.showWarningMessage(
        "Achievements: Failed to acquire database lock. Running in read-only mode."
      );
      return false;
    }
  }

  /**
   * Releases the database lock if it was acquired.
   *
   * @returns Promise<void>
   */
  export async function releaseLock(): Promise<void> {
    stopLockRefresh();

    if (lockRelease) {
      try {
        await lockRelease();
        logger.info("Database lock released successfully");
      } catch (err) {
        logger.error(
          `Failed to release database lock: ${(err as Error).message}`
        );
      } finally {
        lockRelease = null;
      }
    }

    // Clean up the lock files
    if (databasePath) {
      for (const filePath of [
        getLockFilePath(databasePath),
        getLockTargetPath(databasePath),
      ]) {
        try {
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            logger.debug(`Lock file removed: ${filePath}`);
          }
        } catch (err) {
          // Ignore cleanup errors - the file might already be removed
          logger.debug(
            `Could not remove lock file (may already be removed): ${
              (err as Error).message
            }`
          );
        }
      }
    }

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
   * Check if a database file is currently locked.
   * Useful for testing and diagnostics.
   *
   * @param dbPath - The database file path
   * @returns Promise<boolean> - true if locked
   */
  export async function checkLock(dbPath: string): Promise<boolean> {
    const metadata = readLockMetadata(dbPath);
    if (!metadata) {
      return false;
    }
    // A lock whose timestamp is older than the stale threshold is not live
    return Date.now() - metadata.lockTime <= LOCK_STALE_THRESHOLD_MS;
  }

  /**
   * Force reset the readonly state. Used primarily for testing.
   * @internal
   */
  export function _resetState(): void {
    stopLockRefresh();
    lockRelease = null;
    isReadOnlyMode = false;
    databasePath = null;
  }
}
