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

    // Currently max version is 1 (since we merged migration 2 into 1)
    assert.strictEqual(version, 1, "Database should be at version 1");

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
    ];

    for (const index of expectedIndexes) {
      assert.ok(indexNames.includes(index), `Index ${index} should exist`);
    }
  });
});
