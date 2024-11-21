/**
 * Database control module for achievements extension
 * @author: BoxBoxJason
 * @date 2024-11-11
 */

import * as path from 'path';
import * as fs from 'fs';
import logger from '../../utils/logger';
import * as vscode from 'vscode';
import BetterSqlite3 from 'better-sqlite3';
import { applyMigration } from './migrations';
import { db_init } from './init/init';

let DATABASE_PATH: string;
const DATABASE_FILENAME = 'achievements.sqlite';
let DB: BetterSqlite3.Database | null = null;

export namespace db_model {
  export function openDB(): BetterSqlite3.Database {
    if (DB) {
      try {
        // Check if the database connection is alive by performing a simple query
        DB.prepare('SELECT 1').get(); // This will throw an error if the connection is not valid
      } catch (error) {
        logger.error(`Database connection check failed, reopening: ${(error as Error).message}`);
        DB = createDBConnection(); // Reopen connection if it fails
      }
    } else {
      DB = createDBConnection(); // Open connection if it does not exist
    }

    return DB;
  }

  function createDBConnection(): BetterSqlite3.Database {
    try {
      logger.debug(`Opening new database connection at: ${DATABASE_PATH}`);
      DB = new BetterSqlite3(DATABASE_PATH);
      logger.debug('Database connection opened successfully');
    } catch (err) {
      logger.error(`Failed to open database: ${(err as Error).message}`);
    }
    return DB!;
  }

  export function activate(context: vscode.ExtensionContext) {
    let databaseDir = context.globalStorageUri.fsPath;
    fs.mkdirSync(databaseDir, { recursive: true });
    DATABASE_PATH = path.join(databaseDir, DATABASE_FILENAME);
    const db = openDB();
    applyMigration(db,-1);
    db_init.activate();
  }

  export function deactivate() {
    if (DB) {
      try {
        DB.close();
        logger.info('Database connection closed successfully.');
      } catch (err) {
        logger.error(`Failed to close database: ${(err as Error).message}`);
      }
    }
  }
}
