/**
 * Database control module for achievements extension
 *
 * @namespace db_model
 * @author: BoxBoxJason
 */

import * as crypto from "node:crypto";
import * as path from "node:path";
import * as fs from "node:fs";
import logger from "../../utils/logger";
import * as vscode from "vscode";
import initSqlJs, { Database, SqlJsStatic, SqlValue } from "sql.js";
import { applyMigration } from "./migrations";
import { db_init } from "./init/init";
import { db_lock } from "../lock";

// ================== MODULE VARIABLES ==================
// Path to the database file
let DATABASE_PATH: string;
// Database file name
const DATABASE_FILENAME = "achievements.sqlite";
// Database connection object
let DB: Database | null = null;
let SQL: SqlJsStatic | null = null;
// Flag to prevent database saves during initialization
let isInitializing = false;
// Debounce window for scheduleSave(): coalesces bursts of mutations
// (e.g. keystrokes) into a single full-DB export/write.
const SAVE_DEBOUNCE_MS = 2000;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
// Tail of the queue of database saves, so that they never overlap
let saveChain: Promise<void> = Promise.resolve();
// Suffix of the temporary files database saves are written to
const TEMP_SUFFIX = ".tmp";
// Age after which a temporary save file is known to be abandoned
const TEMP_FILE_MAX_AGE_MS = 60000;
// Errors with which Windows refuses to replace a file another process (an
// antivirus, an indexer, another window reading it) has open. They are
// transient, so the rename is retried a few times before giving up.
const TRANSIENT_RENAME_ERRORS = new Set(["EPERM", "EACCES", "EBUSY"]);
const RENAME_RETRY_DELAYS_MS = [50, 100, 200, 400, 800];

// ================== MODULE FUNCTIONS ==================

/**
 * Database control module for achievements extension
 *
 * @namespace db_model
 * @function getDB
 * @function init
 * @function saveDB
 * @function activate
 * @function deactivate
 */
export namespace db_model {
  /**
   * Get the database connection object.
   *
   * @returns {Promise<Database>} The database connection object
   */
  export async function getDB(): Promise<Database> {
    if (!DB) {
      throw new Error("Database not initialized. Call activate() first.");
    }
    return DB;
  }

  /**
   * Check if the database is ready for operations.
   * Returns false while initialization is in progress.
   *
   * @returns {boolean} True if database is fully initialized and ready
   */
  export function isReady(): boolean {
    return !isInitializing && DB !== null;
  }

  /**
   * Open an existing database file, falling back to a fresh database if the
   * file on disk is unusable.
   *
   * sql.js accepts any buffer in its `Database` constructor and only reports
   * a damaged file on the first read, so the image is probed here rather than
   * left to blow up later in the migrations (which would fail activation and
   * take every command and listener down with it).
   *
   * Only the instance holding the lock may move the file aside: a read-only
   * instance could otherwise move away a file the writer just saved.
   *
   * @param {SqlJsStatic} sql The sql.js runtime
   * @param {Buffer} buffer The database file contents
   * @param {boolean} writable Whether this instance holds the database lock
   * @returns {Promise<Database>} The database connection object
   */
  async function loadExistingDatabase(
    sql: SqlJsStatic,
    buffer: Buffer,
    writable: boolean,
  ): Promise<Database> {
    let db: Database | null = null;
    try {
      db = new sql.Database(buffer);
      const result = db.exec("PRAGMA quick_check");
      const status = result[0]?.values[0]?.[0];
      if (status !== "ok") {
        throw new Error(`integrity check returned: ${String(status)}`);
      }
      return db;
    } catch (err) {
      try {
        db?.close();
      } catch {
        // The database is already unusable, nothing to salvage here
      }
      if (writable) {
        await quarantineDatabase((err as Error).message);
      } else {
        // The file is left for the instance holding the lock to deal with
        logger.warn(
          `Could not read the database (${(err as Error).message}), ` +
            "showing an empty one in this read-only window",
        );
      }
      return new sql.Database();
    }
  }

  /**
   * Move a damaged database file aside so the extension can start over with a
   * fresh one instead of failing on every activation.
   *
   * @param {string} reason The failure that made the database unusable
   * @returns {Promise<void>}
   */
  async function quarantineDatabase(reason: string): Promise<void> {
    const backupPath = `${DATABASE_PATH}.corrupted-${Date.now()}`;
    let backedUp = false;
    try {
      await fs.promises.rename(DATABASE_PATH, backupPath);
      backedUp = true;
    } catch (err) {
      logger.error(
        `Failed to move the corrupted database aside: ${(err as Error).message}`,
      );
    }

    logger.showError(
      `Achievements: the database was damaged (${reason}) and has been reset. ` +
        (backedUp
          ? `The previous file was kept at ${backupPath}.`
          : "The previous file could not be kept."),
    );
  }

  /**
   * Initialize the database.
   *
   * @param {vscode.ExtensionContext} context The extension context object
   * @param {boolean} writable Whether this instance holds the database lock
   * @returns {Promise<void>}
   */
  async function init(
    context: vscode.ExtensionContext,
    writable: boolean,
  ): Promise<void> {
    try {
      const wasmPath = path.join(
        context.extensionPath,
        "node_modules",
        "sql.js",
        "dist",
        "sql-wasm.wasm",
      );

      SQL = await initSqlJs({
        locateFile: () => wasmPath,
      });

      let buffer: Buffer | null = null;
      if (fs.existsSync(DATABASE_PATH)) {
        logger.debug(`Loading database from: ${DATABASE_PATH}`);
        buffer = await fs.promises.readFile(DATABASE_PATH);
      }

      if (buffer && buffer.length > 0) {
        DB = await loadExistingDatabase(SQL, buffer, writable);
      } else {
        logger.debug("Creating new database");
        DB = new SQL.Database();
        await saveDB();
      }

      logger.debug("Database initialized successfully");
    } catch (err) {
      // Fatal for the extension's core functionality and not otherwise
      // surfaced to the user (the caller re-throws without its own UI),
      // so this is one of the rare cases worth an explicit notification.
      logger.showError(
        `Achievements: Failed to initialize database: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Save the database to disk.
   * Will not save if in readonly mode or during initialization.
   *
   * @returns {Promise<void>}
   */
  export function saveDB(): Promise<void> {
    // Saves are chained so two of them (e.g. a debounced save still in flight
    // when deactivate() flushes) never write the file at the same time.
    const run = saveChain.then(writeDatabaseFile, writeDatabaseFile);
    saveChain = run;
    return run;
  }

  /**
   * Export the in-memory database and atomically replace the file on disk.
   * Only ever called through saveDB(), one at a time.
   *
   * @returns {Promise<void>}
   */
  async function writeDatabaseFile(): Promise<void> {
    // Prevent saves during database initialization to avoid partial/corrupted state
    if (isInitializing) {
      logger.debug("Skipping database save - database is still initializing");
      return;
    }

    if (db_lock.isReadOnly()) {
      logger.debug("Skipping database save - running in readonly mode");
      return;
    }

    if (!DB) {
      return;
    }

    // Never write without owning the lock: another instance holds its own
    // copy of the database in memory, and two writers corrupt the file.
    if (!db_lock.holdsLock()) {
      logger.warn("Skipping database save - database lock is not held");
      return;
    }

    // Write to a sibling temporary file and rename over the database: a
    // plain writeFile() truncates the real file first, so a crash or a
    // shutdown mid-write would leave a damaged database behind. rename() is
    // atomic within a directory, so the database on disk is always either
    // the previous save or this one. The temporary name is unique so that no
    // other save, even from another process, can ever write into it.
    const tempPath = `${DATABASE_PATH}.${process.pid}-${crypto
      .randomBytes(6)
      .toString("hex")}${TEMP_SUFFIX}`;
    try {
      const buffer = Buffer.from(DB.export());
      const handle = await fs.promises.open(tempPath, "wx");
      try {
        await handle.writeFile(buffer);
        // Flush to disk before the rename, otherwise a power loss can leave
        // the renamed file empty or partially written
        await handle.sync();
      } finally {
        await handle.close();
      }
      await replaceDatabaseFile(tempPath);
    } catch (err) {
      logger.error(`Failed to save database: ${(err as Error).message}`);
      try {
        await fs.promises.rm(tempPath, { force: true });
      } catch {
        // Cleaned up by removeLeftoverTempFiles() on next activation
      }
    }
  }

  /**
   * Move a fully written temporary save over the database file.
   *
   * The lock is checked again right before the rename: the export and the
   * flush above are asynchronous, and the lock may have been lost (and
   * another instance may have loaded the file) in the meantime.
   *
   * @param {string} tempPath The temporary file holding the new database
   * @returns {Promise<void>}
   */
  async function replaceDatabaseFile(tempPath: string): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      if (!db_lock.holdsLock()) {
        throw new Error("the database lock was lost during the save");
      }
      try {
        await fs.promises.rename(tempPath, DATABASE_PATH);
        return;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (
          attempt >= RENAME_RETRY_DELAYS_MS.length ||
          !code ||
          !TRANSIENT_RENAME_ERRORS.has(code)
        ) {
          throw err;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, RENAME_RETRY_DELAYS_MS[attempt]),
        );
      }
    }
  }

  /**
   * Remove temporary save files left behind by saves that were interrupted
   * (e.g. an extension host killed mid-write). Only called while holding the
   * lock, and only removes files old enough not to belong to a live save.
   *
   * @returns {Promise<void>}
   */
  async function removeLeftoverTempFiles(): Promise<void> {
    const dir = path.dirname(DATABASE_PATH);
    const prefix = `${path.basename(DATABASE_PATH)}.`;
    try {
      for (const name of await fs.promises.readdir(dir)) {
        if (!name.startsWith(prefix) || !name.endsWith(TEMP_SUFFIX)) {
          continue;
        }
        const filePath = path.join(dir, name);
        const { mtimeMs } = await fs.promises.stat(filePath);
        if (Date.now() - mtimeMs > TEMP_FILE_MAX_AGE_MS) {
          await fs.promises.rm(filePath, { force: true });
        }
      }
    } catch (err) {
      logger.debug(
        `Could not clean up temporary database files: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Schedule a database save, coalescing calls that happen within the
   * debounce window into a single saveDB() (a full DB export + file
   * rewrite) instead of blocking the caller on it. Prefer this over
   * calling saveDB() directly from mutation hot paths (e.g. per-keystroke
   * progression updates); use saveDB() directly when the write must
   * happen immediately and be awaited (init, tests).
   *
   * @returns {void}
   */
  export function scheduleSave(): void {
    if (saveTimer) {
      return;
    }
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveDB().catch((err: unknown) => {
        logger.error(`Failed to run scheduled database save: ${err}`);
      });
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Cancel any pending debounced save and write the database immediately.
   * Call this before the database connection is closed (e.g. deactivate())
   * so a debounced mutation is never silently lost.
   *
   * @returns {Promise<void>}
   */
  export async function flushPendingSave(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await saveDB();
  }

  /**
   * Activate the database module.
   * This function should be called when the extension is activated.
   * It will create the database file if it does not exist, and apply any necessary migrations.
   *
   * @memberof db_model
   * @function activate
   *
   * @param {vscode.ExtensionContext} context The extension context object
   * @param {string} dbPath Optional custom database path (for testing)
   * @returns {Promise<boolean>} True if database is writable, false if readonly
   */
  export async function activate(
    context: vscode.ExtensionContext,
    dbPath?: string,
  ): Promise<boolean> {
    // Set flag to prevent saves during initialization
    isInitializing = true;
    let hasLock = false;
    let succeeded = false;

    try {
      const databaseDir = context.globalStorageUri.fsPath;
      await fs.promises.mkdir(databaseDir, { recursive: true });
      DATABASE_PATH = dbPath || path.join(databaseDir, DATABASE_FILENAME);

      // Try to acquire the database lock
      hasLock = await db_lock.acquireLock(DATABASE_PATH);

      await init(context, hasLock);

      if (DB) {
        // Only apply migrations and init data if we have write access
        if (hasLock) {
          await removeLeftoverTempFiles();
          await applyMigration(DB, -1);
          await db_init.activate();
        }
      }
      succeeded = true;
    } catch (err) {
      // Nothing will ever write the database from this window: release the
      // lock so another window can take it instead of starting read-only
      if (hasLock) {
        hasLock = false;
        await db_lock.releaseLock();
      }
      throw err;
    } finally {
      // Mark database as ready and perform final save if we have write access
      isInitializing = false;
      if (succeeded && hasLock && DB && !db_lock.isReadOnly()) {
        await saveDB();
      }
    }

    return hasLock;
  }

  /**
   * Deactivate the database module.
   * This function should be called when the extension is deactivated.
   * It will close the database connection and release the lock.
   *
   * @memberof db_model
   * @function deactivate
   *
   * @returns {Promise<void>}
   */
  export async function deactivate(): Promise<void> {
    // Reset initialization flag on deactivation
    isInitializing = false;

    if (DB && !db_lock.isReadOnly()) {
      await flushPendingSave();
    }

    if (DB) {
      try {
        DB.close();
        DB = null;
        logger.info("Database connection closed successfully.");
      } catch (err) {
        logger.error(`Failed to close database: ${(err as Error).message}`);
      }
    }

    // Release the database lock
    await db_lock.releaseLock();
  }

  /**
   * Reset module state for testing purposes.
   * This function should only be used in tests.
   *
   * @internal
   */
  export function _resetState(): void {
    isInitializing = false;
    DB = null;
    SQL = null;
    saveChain = Promise.resolve();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  }

  /**
   * Execute a query and return the first row as an object (or null if no rows).
   *
   * @param {Database} db The database connection object
   * @param {string} query The query to execute
   * @param {SqlValue[]} params The parameters to bind to the query
   * @returns {T | null} The first result row or null
   */
  export function get<T extends object>(
    db: Database,
    query: string,
    params?: SqlValue[],
  ): T | null {
    const stmt = db.prepare(query);
    try {
      stmt.bind(params);
      let result: T | null = null;
      if (stmt.step()) {
        result = stmt.getAsObject() as T;
      }
      return result;
    } finally {
      stmt.free();
    }
  }

  /**
   * Execute a query and return all rows as objects.
   *
   * @param {Database} db The database connection object
   * @param {string} query The query to execute
   * @param {SqlValue[]} params The parameters to bind to the query
   * @returns {T[]} The result rows
   */
  export function getAll<T extends object>(
    db: Database,
    query: string,
    params?: SqlValue[],
  ): T[] {
    const stmt = db.prepare(query);
    try {
      stmt.bind(params);
      const result: T[] = [];
      while (stmt.step()) {
        result.push(stmt.getAsObject() as T);
      }
      return result;
    } finally {
      stmt.free();
    }
  }
}
