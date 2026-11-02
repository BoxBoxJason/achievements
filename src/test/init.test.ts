import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "node:path";
import { db_model } from "../database/model/model";
import { db_lock } from "../database/lock";
import { db_init } from "../database/model/init/init";
import Achievement from "../database/model/tables/Achievement";
import Progression from "../database/model/tables/Progression";
import { StackingTemplates } from "../database/model/init/StackingTemplates";
import { constants } from "../constants";
import { getMockContext, cleanupMockContext } from "./utils";

suite("Database Init Test Suite", () => {
  let context: vscode.ExtensionContext;

  setup(async () => {
    context = getMockContext();
    db_lock._resetState();
    db_model._resetState();
    await db_model.activate(
      context,
      path.join(context.globalStorageUri.fsPath, "test.sqlite"),
    );
  });

  teardown(async () => {
    await db_model.deactivate();
    cleanupMockContext(context);
  });

  async function count(query: string, params: string[] = []): Promise<number> {
    const db = await db_model.getDB();
    return Number(db.exec(query, params)[0].values[0][0]);
  }

  /** Re-create the achievements an older version stored for a progression */
  async function createLegacyAchievements(progressionName: string) {
    await Progression.toDB([
      new Progression({ name: progressionName, type: "integer", value: 3 }),
    ]);
    await Achievement.fromStackingTemplateToDB({
      title: "Legacy %d",
      icon: "LEGACY",
      category: "productivity",
      group: "Legacy",
      labels: ["productivity", "legacy"],
      criterias: [progressionName],
      criteriasFunctions: [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Do ${progressionName} things`,
      minTier: 0,
      maxTier: 3,
      expFunction: StackingTemplates.STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });
  }

  test("activate should remove the achievements of obsolete progressions", async () => {
    const [obsolete] = db_init.OBSOLETE_PROGRESSIONS;
    const achievementsBefore = await count("SELECT COUNT(*) FROM achievements");
    await createLegacyAchievements(obsolete);
    assert.strictEqual(
      await count("SELECT COUNT(*) FROM achievements"),
      achievementsBefore + 4,
    );

    await db_init.activate();

    assert.strictEqual(
      await count("SELECT COUNT(*) FROM achievements"),
      achievementsBefore,
      "Only the obsolete achievements are removed",
    );
    assert.strictEqual(
      await count("SELECT COUNT(*) FROM progressions WHERE name = ?", [obsolete]),
      0,
    );
    for (const table of ["achievement_labels", "achievement_criterias"]) {
      assert.strictEqual(
        await count(
          `SELECT COUNT(*) FROM ${table}
           WHERE achievement_id NOT IN (SELECT id FROM achievements)`,
        ),
        0,
        `No orphan rows should be left in ${table}`,
      );
    }
    assert.strictEqual(
      await count(
        `SELECT COUNT(*) FROM achievement_requirements
         WHERE achievement_id NOT IN (SELECT id FROM achievements)
            OR requirement_id NOT IN (SELECT id FROM achievements)`,
      ),
      0,
      "No orphan rows should be left in achievement_requirements",
    );
  });

  test("activate should not create achievements for obsolete progressions", async () => {
    await db_init.activate();
    for (const name of db_init.OBSOLETE_PROGRESSIONS) {
      assert.strictEqual(
        await count("SELECT COUNT(*) FROM progressions WHERE name = ?", [name]),
        0,
      );
    }
    assert.strictEqual(
      await count("SELECT COUNT(*) FROM achievements WHERE title LIKE ?", [
        "Snippets Master %",
      ]),
      0,
    );
  });
  test("activate should keep an achievement whose prerequisite was removed", async () => {
    const [obsolete] = db_init.OBSOLETE_PROGRESSIONS;
    await createLegacyAchievements(obsolete);
    await Progression.toDB([
      new Progression({ name: "kept_progression", type: "integer", value: 0 }),
    ]);
    await Achievement.fromStackingTemplateToDB({
      title: "Kept %d",
      icon: "KEPT",
      category: "productivity",
      group: "Kept",
      labels: ["productivity"],
      criterias: ["kept_progression"],
      criteriasFunctions: [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: "Do kept things",
      minTier: 0,
      maxTier: 0,
      expFunction: StackingTemplates.STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });
    const db = await db_model.getDB();
    db.run(
      `INSERT INTO achievement_requirements (achievement_id, requirement_id)
       SELECT kept.id, legacy.id FROM achievements kept, achievements legacy
       WHERE kept.title = 'Kept 1' AND legacy.title = 'Legacy 1'`,
    );

    await db_init.activate();

    assert.strictEqual(
      await count("SELECT COUNT(*) FROM achievements WHERE title = 'Kept 1'"),
      1,
      "Only the obsolete achievements are removed",
    );
    assert.strictEqual(
      await count(
        `SELECT COUNT(*) FROM achievement_requirements r
         JOIN achievements a ON a.id = r.achievement_id
         WHERE a.title = 'Kept 1'`,
      ),
      0,
      "It no longer waits for a prerequisite that is gone",
    );
  });

  test("no tracked criteria should be listed as obsolete", () => {
    // It would be deleted, with its progress, on every startup
    const tracked = new Set<string>(Object.values(constants.criteria));
    assert.deepStrictEqual(
      db_init.OBSOLETE_PROGRESSIONS.filter((name) => tracked.has(name)),
      [],
    );
  });
});
