import * as assert from "assert";
import initSqlJs, { Database } from "sql.js";
import { applyMigration } from "../database/model/migrations";

suite("Migrations Test Suite", () => {
  let db: Database;

  setup(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
  });

  teardown(() => {
    db.close();
  });

  test("applyMigration should apply all migrations and update schema_version", async () => {
    await applyMigration(db);

    const res = db.exec("SELECT * FROM schema_version ORDER BY version ASC");

    // Check if table exists and has rows
    assert.strictEqual(
      res.length,
      1,
      "schema_version table should exist and have data"
    );
    const rows = res[0].values;

    console.log("Schema Version Rows:", JSON.stringify(rows));

    // We expect the last row to be the latest version
    const lastRow = rows[rows.length - 1];
    const version = lastRow[1]; // version column is 2nd (index 1)

    assert.strictEqual(version, 2, "Database should be at version 2");

    // Verify indexes exist
    const indexes = db.exec(
      "SELECT name FROM sqlite_master WHERE type='index'"
    );
    const indexNames = indexes[0].values.map((v) => v[0]);

    const expectedIndexes = [
      "idx_achievement_criterias_progression_id",
      "idx_achievements_category",
      "idx_achievements_group",
      "idx_achievements_achieved",
      "idx_achievement_labels_label",
      "idx_achievement_requirements_requirement_id",
      "idx_achievements_chain_key",
    ];

    for (const index of expectedIndexes) {
      assert.ok(indexNames.includes(index), `Index ${index} should exist`);
    }
  });

  const achievementColumns = (): string[] => {
    const res = db.exec("PRAGMA table_info(achievements)");
    return res[0].values.map((row) => String(row[1]));
  };

  test("migration 2 should add the chain column and be reversible", async () => {
    await applyMigration(db);
    assert.ok(achievementColumns().includes("chain"));

    await applyMigration(db, 1);
    assert.ok(!achievementColumns().includes("chain"));
    const indexes = db.exec(
      "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_achievements_chain_key'"
    );
    assert.strictEqual(indexes.length, 0);

    await applyMigration(db);
    assert.ok(achievementColumns().includes("chain"));
  });

  test("migration 2 should be re-applicable after an older version dropped its schema_version row", async () => {
    await applyMigration(db);
    // An older extension version sharing the database (devcontainers) only
    // knows migration 1: it "downgrades" by deleting the version row while
    // leaving the column in place
    db.run("DELETE FROM schema_version WHERE version = 2");

    await applyMigration(db);
    assert.ok(achievementColumns().includes("chain"));
    const res = db.exec("SELECT MAX(version) FROM schema_version");
    assert.strictEqual(res[0].values[0][0], 2);
  });
});
