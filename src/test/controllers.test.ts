import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "node:path";
import { AchievementController } from "../database/controller/achievements";
import { TimeSpentController } from "../database/controller/timespent";
import { ProgressionController } from "../database/controller/progressions";
import { getMockContext, cleanupMockContext } from "./utils";
import { DailySession } from "../database/model/tables/DailySession";
import Progression from "../database/model/tables/Progression";
import { constants } from "../constants";
import { db_model } from "../database/model/model";
import { db_lock } from "../database/lock";

suite("Controllers Test Suite", () => {
  let context: vscode.ExtensionContext;
  let dbPath: string;

  setup(async () => {
    context = getMockContext();
    dbPath = path.join(context.globalStorageUri.fsPath, "test.sqlite");
    db_lock._resetState();
    await db_model.activate(context, dbPath);
  });

  teardown(async () => {
    await db_model.deactivate();
    cleanupMockContext(context);
  });

  test("AchievementController.getAchievableAchievementsByCriterias should return achievements", async () => {
    // Assuming default achievements are populated
    const result =
      await AchievementController.getAchievableAchievementsByCriterias([
        constants.criteria.FILES_CREATED,
      ]);
    assert.ok(result.achievements);
  });

  test("AchievementController.getAchievements should return achievements", async () => {
    const result = await AchievementController.getAchievements({});
    assert.ok(result.achievements.length > 0);
  });

  test("AchievementController.getJsonAchievements should return achievements", async () => {
    const result = await AchievementController.getJsonAchievements({});
    assert.ok(result.achievements.length > 0);
  });

  test("AchievementController.getJsonFilters should return filters", async () => {
    const result = await AchievementController.getJsonFilters();
    assert.ok(result.categories);
    assert.ok(result.groups);
    assert.ok(result.labels);
  });

  test("AchievementController.getAchievements should handle filters", async () => {
    // Test limit and offset
    const result = await AchievementController.getAchievements({
      limit: 1,
      offset: 0,
    });
    assert.strictEqual(result.achievements.length, 1);

    // Test sort
    const result2 = await AchievementController.getAchievements({
      sortCriteria: "title",
      sortDirection: "ASC",
    });
    assert.ok(result2.achievements.length > 0);

    // Test invalid sort criteria (should throw)
    await assert.rejects(async () => {
      await AchievementController.getAchievements({ sortCriteria: "invalid" });
    });

    // Test invalid sort direction (should throw)
    await assert.rejects(async () => {
      await AchievementController.getAchievements({ sortDirection: "INVALID" });
    });

    // Test negative limit (should throw)
    await assert.rejects(async () => {
      await AchievementController.getAchievements({ limit: -1 });
    });

    // Test negative offset (should throw)
    await assert.rejects(async () => {
      await AchievementController.getAchievements({ offset: -1 });
    });

    // Test trimming
    const result3 = await AchievementController.getAchievements({
      title: "  ",
    });
    // Should ignore empty title
    assert.ok(result3.achievements.length > 0);

    // Test category trimming
    const result4 = await AchievementController.getAchievements({
      category: "  ",
    });
    assert.ok(result4.achievements.length > 0);

    // Test group trimming
    const result5 = await AchievementController.getAchievements({
      group: "  ",
    });
    assert.ok(result5.achievements.length > 0);

    // Test criterias trimming
    const result6 = await AchievementController.getAchievements({
      criterias: ["  ", ""],
    });
    assert.ok(result6.achievements.length > 0);

    // Test labels trimming
    const result7 = await AchievementController.getAchievements({
      labels: ["  ", ""],
    });
    assert.ok(result7.achievements.length > 0);
  });

  test("TimeSpentController.updateTimeSpentFromSessions should update progressions", async () => {
    // Insert a daily session
    const today = new Date().toISOString().split("T")[0];
    await DailySession.getOrCreate(today, 3600);

    await TimeSpentController.updateTimeSpentFromSessions();

    const progressions = await Progression.getProgressions({
      name: constants.criteria.DAILY_TIME_SPENT,
    });
    const progression = progressions[0];
    assert.strictEqual(progression?.value, 3600);
  });

  test("TimeSpentController.getTimeSpent should return counters", async () => {
    // Setup progressions
    const p1 = new Progression({
      name: constants.criteria.DAILY_TIME_SPENT,
      value: 100,
      type: "number",
    });
    const p2 = new Progression({
      name: constants.criteria.TWO_WEEKS_TIME_SPENT,
      value: 200,
      type: "number",
    });
    await Progression.toDB([p1, p2]);

    // We need to pass a map of progressions to getTimeSpent
    // But getTimeSpent takes { [key: string]: number } which seems to be values?
    // Let's check the signature.
    // export function getTimeSpent(progressions: { [key: string]: number }): { [key: string]: number }

    // It seems it takes a map of progression values.
    const input = {
      [constants.criteria.DAILY_TIME_SPENT]: 100,
      [constants.criteria.TWO_WEEKS_TIME_SPENT]: 200,
    };

    const result = TimeSpentController.getTimeSpent(input);
    assert.strictEqual(result[constants.criteria.DAILY_TIME_SPENT], 100);
    assert.strictEqual(result[constants.criteria.TWO_WEEKS_TIME_SPENT], 200);
  });

  test("ProgressionController.updateProgressions should update multiple progressions", async () => {
    // Create progressions first
    const p1 = new Progression({
      name: "test_prog_1",
      value: 0,
      type: "number",
    });
    await p1.toRow();
    const p2 = new Progression({
      name: "test_prog_2",
      value: 0,
      type: "number",
    });
    await p2.toRow();

    await ProgressionController.updateProgressions([
      { name: "test_prog_1", value: 10 },
      { name: "test_prog_2", value: 20 },
    ]);

    const all = await ProgressionController.getProgressions();
    assert.strictEqual(all["test_prog_1"], 10);
    assert.strictEqual(all["test_prog_2"], 20);
  });
});
