/**
 * Migrations for the database schema, contains the initial schema and any future migrations.
 * Tables are defined here
 *
 * @module migrations
 * @requires sql.js
 * @see logger
 *
 * @author BoxBoxJason
 */
import logger from "../../utils/logger";
import { db_model } from "./model";

// ==================== TYPES ====================
// Migration object type
interface Migration {
  version: number;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const MIGRATIONS: { [key: number]: Migration } = {
  1: {
    version: 1,
    description: "Initial schema",
    up: async () => {
      await db_model.withLock((db) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS schema_version (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              version INTEGER UNIQUE NOT NULL,
              applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);

        db.run(`
            CREATE TABLE IF NOT EXISTS achievements (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT UNIQUE NOT NULL,
              icon TEXT NOT NULL,
              category TEXT NOT NULL,
              "group" TEXT NOT NULL,
              description TEXT NOT NULL,
              tier INTEGER NOT NULL,
              exp INTEGER NOT NULL,
              hidden INTEGER NOT NULL,
              repeatable INTEGER NOT NULL,
              achieved BOOLEAN NOT NULL DEFAULT FALSE,
              achievedAt DATETIME
            );
          `);

        db.run(`
            CREATE TABLE IF NOT EXISTS achievement_labels (
              achievement_id INTEGER NOT NULL,
              label TEXT NOT NULL,
              PRIMARY KEY (achievement_id, label),
              FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE
            );
          `);

        db.run(`
            CREATE TABLE IF NOT EXISTS achievement_criterias (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              achievement_id INTEGER NOT NULL,
              progression_id INTEGER NOT NULL,
              required_value TEXT NOT NULL,
              "type" TEXT NOT NULL DEFAULT 'number',
              comparison_operator TEXT NOT NULL DEFAULT '>=',
              FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE,
              FOREIGN KEY (progression_id) REFERENCES progressions (id) ON DELETE CASCADE,
              UNIQUE (achievement_id, progression_id)
            );
          `);

        db.run(`
            CREATE TABLE IF NOT EXISTS achievement_requirements (
              achievement_id INTEGER NOT NULL,
              requirement_id INTEGER NOT NULL,
              PRIMARY KEY (achievement_id, requirement_id),
              FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE,
              FOREIGN KEY (requirement_id) REFERENCES achievements (id) ON DELETE CASCADE,
              UNIQUE (achievement_id, requirement_id)
            );
          `);

        db.run(`
            CREATE TABLE IF NOT EXISTS progressions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT UNIQUE NOT NULL,
              "type" TEXT NOT NULL,
              value TEXT NOT NULL
            );
          `);

        db.run(`
            CREATE TABLE IF NOT EXISTS daily_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT UNIQUE NOT NULL,
              duration INTEGER NOT NULL
            );
          `);

        logger.info("Migration 1: Initial schema applied successfully.");
      });
    },
    down: async () => {
      await db_model.withLock((db) => {
        db.run("DROP TABLE IF EXISTS schema_version;");
        db.run("DROP TABLE IF EXISTS achievements;");
        db.run("DROP TABLE IF EXISTS achievement_labels;");
        db.run("DROP TABLE IF EXISTS achievement_criterias;");
        db.run("DROP TABLE IF EXISTS achievement_requirements;");
        db.run("DROP TABLE IF EXISTS progressions;");
        db.run("DROP TABLE IF EXISTS daily_sessions;");
        logger.info("Migration 1: Schema rollback applied successfully.");
      });
    },
  },
};

// ==================== MODULE FUNCTIONS ====================

/**
 * Applies the migration to the database to the specified version.
 * If the version is -1, it will apply all migrations to the latest version.
 * If the version is greater than the current version, it will apply the migration up.
 * If the version is less than the current version, it will apply the migration down.
 * If the version is equal to the current version, it will do nothing.
 *
 * @async
 *
 * @param {number} wantedVersion - The version to migrate to
 *
 * @returns {Promise<void>}
 */
export async function applyMigration(wantedVersion: number = -1): Promise<void> {
  let version = 0;

  try {
    const result = await db_model.withLock((db) => {
      return db.exec("SELECT MAX(version) as version FROM schema_version;");
    });
    if (result.length > 0 && result[0].values.length > 0) {
      version = result[0].values[0][0] as number;
    }
  } catch (error) {
    logger.info(
      `No schema_version table found, creating initial schema: ${(error as Error).message}`
    );
  }

  // Set wantedVersion to the latest migration if it is set to -1
  if (wantedVersion === -1 && Object.keys(MIGRATIONS).length > 0) {
    wantedVersion = Math.max(...Object.keys(MIGRATIONS).map(Number));
  }

  if (version === wantedVersion) {
    logger.info(`Database is at schema version ${wantedVersion}`);
    return;
  } else if (version > wantedVersion) {
    logger.info(`Downgrading database from ${version} to ${wantedVersion}`);
    for (let i = version; i > wantedVersion; i--) {
      const migration = MIGRATIONS[i];
      if (migration) {
        logger.info(
          `Applying migration ${migration.version}: ${migration.description}`
        );
        await migration.down();
        await db_model.withLock((db) => {
          db.run("DELETE FROM schema_version WHERE version = ?", [i]);
        });
      }
    }
  } else {
    logger.info(`Upgrading database from ${version} to ${wantedVersion}`);
    for (let i = version + 1; i <= wantedVersion; i++) {
      const migration = MIGRATIONS[i];
      if (migration) {
        logger.info(
          `Applying migration ${migration.version}: ${migration.description}`
        );
        await migration.up();
        await db_model.withLock((db) => {
          db.run(`INSERT INTO schema_version (version) VALUES (?)
            ON CONFLICT(version) DO UPDATE SET applied_at = CURRENT_TIMESTAMP`, [i]);
        });
      }
    }
  }
}
