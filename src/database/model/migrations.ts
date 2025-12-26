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
import { Database } from "sql.js";
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
 * @param {Database} db - The database to apply the migration to
 * @param {number} wantedVersion - The version to migrate to
 *
 * @returns {Promise<void>}
 */
export async function applyMigration(
  db: Database,
  wantedVersion: number = -1
): Promise<void> {
  const migrations: { [key: number]: Migration } = {
    1: {
      version: 1,
      description: "Initial schema",
      up: () => {
        db.run("BEGIN TRANSACTION");
        try {
          // Database version table
          db.run(
            `
            CREATE TABLE IF NOT EXISTS schema_version (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              version INTEGER UNIQUE NOT NULL,
              applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`
          );

          // Achievements table
          db.run(
            `
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
            )`
          );

          // Achievement labels table
          db.run(
            `
            CREATE TABLE IF NOT EXISTS achievement_labels (
              achievement_id INTEGER NOT NULL,
              label TEXT NOT NULL,
              PRIMARY KEY (achievement_id, label),
              FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE
            )`
          );

          // Achievement criteria table
          db.run(
            `
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
          )`
          );

          // Achievement requirements table
          db.run(
            `
            CREATE TABLE IF NOT EXISTS achievement_requirements (
              achievement_id INTEGER NOT NULL,
              requirement_id INTEGER NOT NULL,
              PRIMARY KEY (achievement_id, requirement_id),
              FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE,
              FOREIGN KEY (requirement_id) REFERENCES achievements (id) ON DELETE CASCADE,
              UNIQUE (achievement_id, requirement_id)
            )`
          );

          // Progressions table
          db.run(
            `
            CREATE TABLE IF NOT EXISTS progressions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT UNIQUE NOT NULL,
              "type" TEXT NOT NULL,
              value TEXT NOT NULL
            )`
          );

          // Daily session time spent table
          db.run(
            `
            CREATE TABLE IF NOT EXISTS daily_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT UNIQUE NOT NULL,
              duration INTEGER NOT NULL
            )`
          );

          const indexes_to_create: { [key: string]: string } = {
            // Index for achievement_criterias progression_id (Critical for checkAchievements)
            idx_achievement_criterias_progression_id:
              "achievement_criterias(progression_id)",
            // Index for achievements category filtering (UI)
            idx_achievements_category: "achievements(category)",
            // Index for achievements group filtering (UI)
            idx_achievements_group: 'achievements("group")',
            // Index for achievements achieved filtering (UI)
            idx_achievements_achieved: "achievements(achieved)",
            // Index for achievement_labels filtering (UI)
            idx_achievement_labels_label: "achievement_labels(label)",
            // Index for achievement_requirements requirement_id (Critical for achievable filter)
            idx_achievement_requirements_requirement_id:
              "achievement_requirements(requirement_id)",
          };

          for (const [indexName, indexColumns] of Object.entries(
            indexes_to_create
          )) {
            db.run(
              `CREATE INDEX IF NOT EXISTS ${indexName} ON ${indexColumns}`
            );
          }

          db.run("COMMIT");
        } catch (error) {
          db.run("ROLLBACK");
          throw error;
        }
      },
      down: () => {
        const tables_to_drop = [
          "schema_version",
          "achievements",
          "achievement_requirements",
          "progressions",
          "achievement_criterias",
          "achievement_labels",
          "daily_sessions",
        ];
        const indexes_to_drop = [
          "idx_achievement_criterias_progression_id",
          "idx_achievements_category",
          "idx_achievements_group",
          "idx_achievements_achieved",
          "idx_achievement_labels_label",
          "idx_achievement_requirements_requirement_id",
        ];
        db.run("BEGIN TRANSACTION");
        try {
          for (const index of indexes_to_drop) {
            db.run(`DROP INDEX IF EXISTS ${index}`);
          }
          for (const table of tables_to_drop) {
            db.run(`DROP TABLE IF EXISTS ${table}`);
          }
          db.run("COMMIT");
        } catch (error) {
          db.run("ROLLBACK");
          throw error;
        }
      },
    },
  };

  let version = 0;
  try {
    const res = db.exec("SELECT MAX(version) as version FROM schema_version");
    if (res.length > 0 && res[0].values.length > 0) {
      const val = res[0].values[0][0];
      if (typeof val === "number") {
        version = val;
      }
    }
  } catch (error) {
    logger.info(
      `No schema_version table found, creating initial schema: ${
        (error as Error).message
      }`
    );
  }

  // Set wantedVersion to the latest migration if it is set to -1
  if (wantedVersion === -1 && Object.keys(migrations).length > 0) {
    wantedVersion = Math.max(...Object.keys(migrations).map(Number));
  }

  if (version === wantedVersion) {
    logger.info(`Database is at schema version ${wantedVersion}`);
  } else if (version > wantedVersion) {
    logger.info(`Downgrading database from ${version} to ${wantedVersion}`);
    for (let i = version; i > wantedVersion; i--) {
      const migration = migrations[i];
      if (migration) {
        logger.info(
          `Applying migration ${migration.version}: ${migration.description}`
        );
        migration.down();
        db.run("DELETE FROM schema_version WHERE version = ?", [i]);
      }
    }
  } else {
    logger.info(`Upgrading database from ${version} to ${wantedVersion}`);
    for (let i = version + 1; i <= wantedVersion; i++) {
      const migration = migrations[i];
      if (migration) {
        logger.info(
          `Applying migration ${migration.version}: ${migration.description}`
        );
        migration.up();
        db.run(
          `INSERT INTO schema_version (version) VALUES (?)
          ON CONFLICT(version) DO UPDATE SET applied_at = CURRENT_TIMESTAMP`,
          [i]
        );
      }
    }
  }
}
