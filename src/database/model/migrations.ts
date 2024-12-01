
/**
 * Migrations for the database schema, contains the initial schema and any future migrations.
 * Tables are defined here
 *
 * @module migrations
 * @requires better-sqlite3
 * @see logger
 *
 * @author BoxBoxJason
 */
import BetterSqlite3 from 'better-sqlite3';
import logger from "../../utils/logger";

// ==================== TYPES ====================
// Migration object type
interface Migration {
  version: number;
  description: string;
  up: () => void;
  down: () => void;
}

// ==================== MODULE FUNCTIONS ====================

/**
 * Applies the migration to the database
 *
 * @param {BetterSqlite3.Database} db - The database to apply the migration to
 * @param {number} wantedVersion - The version to migrate to
 *
 * @returns {void}
 */
export function applyMigration(db: BetterSqlite3.Database, wantedVersion: number = -1): void {
  const migrations: { [key: number]: Migration } = {
    1: {
      version: 1,
      description: 'Initial schema',
      up: () => {
        const createTablesTransaction = db.transaction(() => {
          // Database version table
          db.prepare(`
            CREATE TABLE IF NOT EXISTS schema_version (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              version INTEGER UNIQUE NOT NULL,
              applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`).run();

          // Achievements table
          db.prepare(`
            CREATE TABLE IF NOT EXISTS achievements (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT UNIQUE NOT NULL,
              icon TEXT NOT NULL,
              category TEXT NOT NULL,
              "group" TEXT NOT NULL,
              description TEXT NOT NULL,
              tier INTEGER NOT NULL,
              points INTEGER NOT NULL,
              hidden INTEGER NOT NULL,
              repeatable INTEGER NOT NULL,
              achieved BOOLEAN NOT NULL DEFAULT FALSE,
              achievedAt DATETIME
            )`).run();

            // Achievement labels table
          db.prepare(`
            CREATE TABLE IF NOT EXISTS achievement_labels (
              achievement_id INTEGER NOT NULL,
              label TEXT NOT NULL,
              PRIMARY KEY (achievement_id, label),
              FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE
            )`).run();

          // Achievement criteria table
          db.prepare(`
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
          )`).run();

          // Achievement requirements table
          db.prepare(`
            CREATE TABLE IF NOT EXISTS achievement_requirements (
              achievement_id INTEGER NOT NULL,
              requirement_id INTEGER NOT NULL,
              PRIMARY KEY (achievement_id, requirement_id),
              FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE,
              FOREIGN KEY (requirement_id) REFERENCES achievements (id) ON DELETE CASCADE,
              UNIQUE (achievement_id, requirement_id)
            )`).run();

          // Progressions table
          db.prepare(`
            CREATE TABLE IF NOT EXISTS progressions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT UNIQUE NOT NULL,
              "type" TEXT NOT NULL,
              value TEXT NOT NULL
            )`).run();

          // Daily session time spent table
          db.prepare(`
            CREATE TABLE IF NOT EXISTS daily_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT UNIQUE NOT NULL,
              duration INTEGER NOT NULL
            )`).run();
        });
        createTablesTransaction();
      },
      down: () => {
        const dropTablesTransaction = db.transaction(() => {
          db.prepare('DROP TABLE IF EXISTS schema_version').run();
          db.prepare('DROP TABLE IF EXISTS achievements').run();
          db.prepare('DROP TABLE IF EXISTS achievement_requirements').run();
          db.prepare('DROP TABLE IF EXISTS progressions').run();
          db.prepare('DROP TABLE IF EXISTS achievement_criterias').run();
          db.prepare('DROP TABLE IF EXISTS achievement_labels').run();
          db.prepare('DROP TABLE IF EXISTS daily_sessions').run();
        });

        dropTablesTransaction();
      }
    }
  };

  let version = 0;
  try {
    const currentVersion = db.prepare('SELECT MAX(version) as version FROM schema_version').get();
    if (currentVersion && typeof currentVersion === 'object' && currentVersion !== null) {
      if ('version' in currentVersion) {
        const versionValue = (currentVersion as { version: unknown }).version;
        if (typeof versionValue === 'number') {
          version = versionValue;
        }
      }
    }
  } catch (error) {
    logger.info(`No schema_version table found, creating initial schema: ${(error as Error).message}`);
  }

  // Set wantedVersion to the latest migration if it is set to -1
  if (wantedVersion === -1 && Object.keys(migrations).length > 0) {
    wantedVersion = Math.max(...Object.keys(migrations).map(Number));
  }

  if (version === wantedVersion) {
    logger.info(`Database is at schema version ${wantedVersion}`);
    return;
  } else if (version > wantedVersion) {
    logger.info(`Downgrading database from ${version} to ${wantedVersion}`);
    for (let i = version; i > wantedVersion; i--) {
      const migration = migrations[i];
      if (migration) {
        logger.info(`Applying migration ${migration.version}: ${migration.description}`);
        migration.down();
        db.prepare('DELETE FROM schema_version WHERE version = ?').run(i);
      }
    }
  } else {
    logger.info(`Upgrading database from ${version} to ${wantedVersion}`);
    for (let i = version + 1; i <= wantedVersion; i++) {
      const migration = migrations[i];
      if (migration) {
        logger.info(`Applying migration ${migration.version}: ${migration.description}`);
        migration.up();
        db.prepare(`INSERT INTO schema_version (version) VALUES (?)
          ON CONFLICT(version) DO UPDATE SET applied_at = CURRENT_TIMESTAMP`).run(i);
      }
    }
  }
}
