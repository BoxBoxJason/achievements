/**
 * Database lock manager for multi-instance VS Code support
 *
 * This module handles file locking to prevent data corruption when multiple
 * VS Code instances access the same database file.
 *
 * @namespace db_lock
 * @author BoxBoxJason
 */

import * as lockfile from "proper-lockfile";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as vscode from "vscode";
import logger from "../utils/logger";

// ================== MODULE VARIABLES ==================
let lockRelease: (() => Promise<void>) | null = null;
let isReadOnlyMode = false;
let databasePath: string | null = null;

// Lock configuration
const LOCK_OPTIONS: lockfile.LockOptions = {
  // Stale threshold: if lock file mtime is older than this, consider it stale
  // This handles ungraceful shutdowns where the lock wasn't released
  stale: 15000, // 15 seconds
  // How often to update the lock file mtime to prevent staleness
  update: 5000, // 5 seconds
  // Number of retries when acquiring lock
  retries: 0, // Don't retry, just go to readonly mode
  // Use realpath to resolve symlinks
  realpath: false, // Database file may not exist yet
};

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
   * Get the lock file path for a given database path.
   * Uses a cross-platform temporary directory approach for reliability.
   *
   * @param dbPath - The database file path
   * @returns The lock file path
   */
  export function getLockFilePath(dbPath: string): string {
    // Use os.tmpdir() which works on all platforms (Linux, Windows, macOS)
    // and handles readOnlyRootFs scenarios better
    const tmpDir = os.tmpdir();
    // Create a unique but deterministic lock file name based on the database path
    const dbPathHash = Buffer.from(dbPath).toString("base64url");
    return path.join(tmpDir, `achievements-db-${dbPathHash}.lock`);
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
    const lockPath = getLockFilePath(dbPath);

    // Ensure the lock file directory exists
    const lockDir = path.dirname(lockPath);
    await fs.promises.mkdir(lockDir, { recursive: true });

    // Create the lock file if it doesn't exist (proper-lockfile needs a file to lock)
    if (!fs.existsSync(lockPath)) {
      await fs.promises.writeFile(lockPath, "", { flag: "w" });
    }

    try {
      logger.debug(`Attempting to acquire database lock at: ${lockPath}`);

      lockRelease = await lockfile.lock(lockPath, {
        ...LOCK_OPTIONS,
        onCompromised: (err) => {
          // Lock was compromised (e.g., another process removed it)
          logger.error(`Database lock was compromised: ${err.message}`);
          isReadOnlyMode = true;
          lockRelease = null;
          vscode.window.showWarningMessage(
            "Achievements: Database lock was lost. Switching to read-only mode."
          );
        },
      });

      isReadOnlyMode = false;
      logger.info(
        "Database lock acquired successfully - running in write mode"
      );
      return true;
    } catch (err) {
      const error = err as Error;

      if (error.message.includes("ELOCKED")) {
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

    // Clean up the lock file
    if (databasePath) {
      const lockPath = getLockFilePath(databasePath);
      try {
        if (fs.existsSync(lockPath)) {
          await fs.promises.unlink(lockPath);
          logger.debug(`Lock file removed: ${lockPath}`);
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
    const lockPath = getLockFilePath(dbPath);

    if (!fs.existsSync(lockPath)) {
      return false;
    }

    try {
      return await lockfile.check(lockPath, {
        stale: LOCK_OPTIONS.stale,
        realpath: LOCK_OPTIONS.realpath,
      });
    } catch {
      return false;
    }
  }

  /**
   * Force reset the readonly state. Used primarily for testing.
   * @internal
   */
  export function _resetState(): void {
    lockRelease = null;
    isReadOnlyMode = false;
    databasePath = null;
  }
}
