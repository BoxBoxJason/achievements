/**
 * Database control module for achievements extension
 *
 * @namespace db_model
 * @author: BoxBoxJason
 */

import * as path from "path";
import * as fs from "fs";
import logger from "../../utils/logger";
import * as vscode from "vscode";
import BetterSqlite3 from "better-sqlite3";
import { applyMigration } from "./migrations";
import { db_init } from "./init/init";

// ================== MODULE VARIABLES ==================
// Path to the database file
let DATABASE_PATH: string;
// Database file name
const DATABASE_FILENAME = "achievements.sqlite";
// Database connection object
let DB: BetterSqlite3.Database | null = null;

// ================== MODULE FUNCTIONS ==================

/**
 * Database control module for achievements extension
 *
 * @namespace db_model
 * @function openDB
 * @function createDBConnection
 * @function activate
 * @function deactivate
 */
export namespace db_model {
  /**
   * Open a connection to the database. If a connection is already open, it will be reused.
   *
   * @returns {BetterSqlite3.Database} The database connection object
   */
  export function openDB(): BetterSqlite3.Database {
    if (DB) {
      try {
        // Check if the database connection is alive by performing a simple query
        DB.prepare("SELECT 1").get(); // This will throw an error if the connection is not valid
      } catch (error) {
        logger.error(
          `Database connection check failed, reopening: ${
            (error as Error).message
          }`
        );
        DB = createDBConnection(); // Reopen connection if it fails
      }
    } else {
      DB = createDBConnection(); // Open connection if it does not exist
    }

    return DB;
  }

  /**
   * Create a new connection to the database.
   * This function should only be called if a connection does not already exist.
   * If a connection already exists, use `openDB` instead.
   * This function should not be called directly from outside this module.
   *
   * @memberof db_model
   * @private
   * @function createDBConnection
   *
   * @returns {BetterSqlite3.Database} The database connection object
   */
  function createDBConnection(): BetterSqlite3.Database {
    try {
      logger.debug(`Opening new database connection at: ${DATABASE_PATH}`);
      DB = new BetterSqlite3(DATABASE_PATH);
      logger.debug("Database connection opened successfully");
    } catch (err) {
      logger.error(`Failed to open database: ${(err as Error).message}`);
    }
    return DB!;
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
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext) {
    let databaseDir = context.globalStorageUri.fsPath;
    fs.mkdirSync(databaseDir, { recursive: true });
    DATABASE_PATH = path.join(databaseDir, DATABASE_FILENAME);
    const db = openDB();
    applyMigration(db, -1);
    db_init.activate();
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
        logger.info("Database connection closed successfully.");
      } catch (err) {
        logger.error(`Failed to close database: ${(err as Error).message}`);
      }
    }
  }
}
