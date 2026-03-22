/**
 * Database control module for achievements extension
 *
 * @namespace db_model
 * @author: BoxBoxJason
 */

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
   * Initialize the database.
   *
   * @param {vscode.ExtensionContext} context The extension context object
   * @returns {Promise<void>}
   */
  async function init(context: vscode.ExtensionContext): Promise<void> {
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

      if (buffer) {
        DB = new SQL.Database(buffer);
      } else {
        logger.debug("Creating new database");
        DB = new SQL.Database();
        await saveDB();
      }

      logger.debug("Database initialized successfully");
    } catch (err) {
      logger.error(`Failed to initialize database: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Save the database to disk.
   * Will not save if in readonly mode or during initialization.
   *
   * @returns {Promise<void>}
   */
  export async function saveDB(): Promise<void> {
    // Prevent saves during database initialization to avoid partial/corrupted state
    if (isInitializing) {
      logger.debug("Skipping database save - database is still initializing");
      return;
    }

    if (db_lock.isReadOnly()) {
      logger.debug("Skipping database save - running in readonly mode");
      return;
    }

    if (DB) {
      try {
        const data = DB.export();
        const buffer = Buffer.from(data);
        await fs.promises.writeFile(DATABASE_PATH, buffer);
      } catch (err) {
        logger.error(`Failed to save database: ${(err as Error).message}`);
      }
    }
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

    try {
      const databaseDir = context.globalStorageUri.fsPath;
      await fs.promises.mkdir(databaseDir, { recursive: true });
      DATABASE_PATH = dbPath || path.join(databaseDir, DATABASE_FILENAME);

      // Try to acquire the database lock
      hasLock = await db_lock.acquireLock(DATABASE_PATH);

      await init(context);

      if (DB) {
        // Only apply migrations and init data if we have write access
        if (hasLock) {
          await applyMigration(DB, -1);
          await db_init.activate();
        }
      }
    } finally {
      // Mark database as ready and perform final save if we have write access
      isInitializing = false;
      if (hasLock && DB && !db_lock.isReadOnly()) {
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
  }

  /**
   * Execute a query and return all rows as objects.
   *
   * @param {Database} db The database connection object
   * @param {string} query The query to execute
   * @param {any[]} params The parameters to bind to the query
   * @returns {any[]} The result rows
   */
  export function get<T extends object>(
    db: Database,
    query: string,
    params?: SqlValue[],
  ): T | null {
    const stmt = db.prepare(query);
    stmt.bind(params);
    let result: T | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject() as T;
    }
    stmt.free();
    return result;
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
    stmt.bind(params);
    const result: T[] = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return result;
  }
}
