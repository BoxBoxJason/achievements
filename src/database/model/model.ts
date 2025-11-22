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
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { applyMigration } from "./migrations";
import { db_init } from "./init/init";

// ================== MODULE VARIABLES ==================
// Path to the database file
let DATABASE_PATH: string;
// Database file name
const DATABASE_FILENAME = "achievements.sqlite";
// Database connection object
let DB: Database | null = null;
let SQL: SqlJsStatic | null = null;

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
        "sql-wasm.wasm"
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
   *
   * @returns {Promise<void>}
   */
  export async function saveDB(): Promise<void> {
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
   * @returns {Promise<void>}
   */
  export async function activate(
    context: vscode.ExtensionContext,
    dbPath?: string
  ): Promise<void> {
    let databaseDir = context.globalStorageUri.fsPath;
    await fs.promises.mkdir(databaseDir, { recursive: true });
    DATABASE_PATH = dbPath || path.join(databaseDir, DATABASE_FILENAME);

    await init(context);

    if (DB) {
      // @ts-ignore
      await applyMigration(DB, -1);
      await db_init.activate();
      await saveDB();
    }
  }

  /**
   * Deactivate the database module.
   * This function should be called when the extension is deactivated.
   * It will close the database connection.
   *
   * @memberof db_model
   * @function deactivate
   *
   * @returns {void}
   */
  export function deactivate() {
    if (DB) {
      try {
        DB.close();
        DB = null;
        logger.info("Database connection closed successfully.");
      } catch (err) {
        logger.error(`Failed to close database: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Execute a query and return all rows as objects.
   *
   * @param {Database} db The database connection object
   * @param {string} query The query to execute
   * @param {any[]} params The parameters to bind to the query
   * @returns {any[]} The result rows
   */
  export function getAll(db: Database, query: string, params?: any[]): any[] {
    const stmt = db.prepare(query);
    stmt.bind(params);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  /**
   * Execute a query and return the first row as an object.
   *
   * @param {Database} db The database connection object
   * @param {string} query The query to execute
   * @param {any[]} params The parameters to bind to the query
   * @returns {any} The result row
   */
  export function get(db: Database, query: string, params?: any[]): any {
    const stmt = db.prepare(query);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  }
}
