/**
 * Database control module for achievements extension
 *
 * @namespace db_model
 * @author: BoxBoxJason
 */

import * as path from 'path';
import * as fs from 'fs';
import logger from '../../utils/logger';
import * as vscode from 'vscode';
import initSqlJs, { Database, SqlJsStatic, QueryExecResult } from 'sql.js';
import { applyMigration } from './migrations';
import { db_init } from './init/init';
import { Mutex } from 'async-mutex'; // Install async-mutex library if not already

let DATABASE_PATH: string;
const DATABASE_FILENAME = 'achievements.sqlite';
let DB: Database | null = null;
let SQL: SqlJsStatic;

// Mutex for ensuring exclusive access to database operations
const dbMutex = new Mutex();

export namespace db_model {
  /**
   * Open or reuse the database connection.
   *
   * @async
   *
   * @returns {Promise<Database>} - A promise that resolves to the database connection.
   */
  async function openDB(): Promise<Database> {
    if (!SQL) {
      SQL = await initSqlJs({
        locateFile: (file: string) => {
          return `./assets/sql-wasm.wasm`;
        },
      });
    }

    return DB ? DB : await createDBConnection();
  }

  /**
   * Create a new database connection, loading from file if exists.
   *
   * @async
   *
   * @returns {Promise<Database>} - A promise that resolves to the database connection.
   */
  async function createDBConnection(): Promise<Database> {
    try {
      logger.debug(`Opening new database connection at: ${DATABASE_PATH}`);
      let db: Database;
      if (fs.existsSync(DATABASE_PATH)) {
        const fileBuffer = fs.readFileSync(DATABASE_PATH);
        db = new SQL.Database(fileBuffer);
      } else {
        db = new SQL.Database();
      }
      logger.debug('Database connection opened successfully');
      return db;
    } catch (err) {
      logger.error(`Failed to open database: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Initialize database and apply migrations
   *
   * @async
   *
   * @returns {Promise<void>} - A promise that resolves when the database is activated.
   */
  export async function activate(context: vscode.ExtensionContext) {
    const databaseDir = context.globalStorageUri.fsPath;
    fs.mkdirSync(databaseDir, { recursive: true });
    DATABASE_PATH = path.join(databaseDir, DATABASE_FILENAME);
    await applyMigration(-1);
    await db_init.activate();
  }

  /**
   * Close the database connection and save changes to file.
   *
   * @async
   *
   * @returns {Promise<void>} - A promise that resolves when the database is closed.
   */
  export async function deactivate() {
    if (DB !== null) {
      try {
        const data = await db_model.withLock((db) => {
          return db.export();
        });
        fs.writeFileSync(DATABASE_PATH, Buffer.from(data));
        DB = null;
        logger.info('Database connection saved and closed.');
      } catch (err) {
        logger.error(`Failed to save database: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Execute a function with a mutex lock to prevent concurrent database access.
   *
   * @async
   *
   * @param {() => T} operation - The operation to execute with the lock.
   *
   * @returns {Promise<T>} - The result of the operation.
   */
  export async function withLock<T>(operation: (db: Database) => T): Promise<T> {
    return await dbMutex.runExclusive(() => {
      return operation(DB as Database);
    });
  }

  /**
   * Execute a transaction with a mutex lock to prevent concurrent database access.
   * Automatically begins and commits/rolls back the transaction.
   *
   * @async
   *
   * @param {() => T} operation - The operation to execute within the transaction.
   *
   * @returns {Promise<T>} - The result of the operation.
   */
  export async function transactionLock<T>(operation: (db: Database) => T): Promise<T> {
    return await dbMutex.runExclusive(async () => {
      if (!DB) {
        DB = await createDBConnection();
      }
      const transaction = DB.run('BEGIN TRANSACTION');
      try {
        const result = await operation(DB);
        DB.run('COMMIT');
        return result;
      }
      catch (error) {
        DB.run('ROLLBACK');
        throw error;
      }
    });
  }

  /**
   * Execute a SQL query and return the results.
   *
   * @param {QueryExecResult[]} queryResults - The results of the executed query.
   * @param {number[]} indexes - The indexes of the query results to parse.
   *
   * @returns {Object[]} - An array of objects representing the rows of the query results.
   *
   * @throws {Error} - If the query results are empty or if the indexes are invalid.
   */
  export function parseRows(queryResults: QueryExecResult[], indexes = [-1]): Object[] {
    let result: Object[] = [];
    if (queryResults.length === 0 || indexes.length === 0) {
      return result;
    }
    for (const queryResultIndex of indexes) {
      const queryResult = queryResults[queryResultIndex];
      if (queryResult.values.length === 0) {
        continue;
      }
      const columns = queryResult.columns;
      for (let i = 0; i < queryResult.values.length; i++) {
        const row = queryResult.values[i];
        const rowDict: { [key: string]: any } = {};
        for (let j = 0; j < columns.length; j++) {
          const columnName = columns[j];
          rowDict[columnName] = row[j];
        }
        result.push(rowDict);
      }
    }
    return result;
  }

  /**
   * Converts a value to a SQL-compatible type.
   *
   * @param value - The value to convert.
   * @returns {SqlValue} - The converted value.
   */
  export function toSqlValue(value: string | number | boolean | Date): string | number {
    if (typeof value === "boolean") {
      return value ? 1 : 0; // Convert boolean to 1 or 0
    } else if (value instanceof Date) {
      return value.toISOString(); // Convert Date to ISO string
    }
    return value;
  }
}
