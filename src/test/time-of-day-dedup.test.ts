import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "node:path";
import { db_model } from "../database/model/model";
import { db_lock } from "../database/lock";
import { db_init } from "../database/model/init/init";
import { ProgressionController } from "../database/controller/progressions";
import { timeListeners } from "../listeners/time";
import { constants } from "../constants";
import { getMockContext, cleanupMockContext } from "./utils";

suite("Time Of Day Session Dedup Test Suite", () => {
  let context: vscode.ExtensionContext;
  let dbPath: string;

  setup(async () => {
    context = getMockContext();
    dbPath = path.join(context.globalStorageUri.fsPath, "achievements.sqlite");
    db_lock._resetState();
    db_model._resetState();
    await db_model.activate(context, dbPath);
    await db_init.activate(); // Initialize progressions
  });

  teardown(async () => {
    await db_model.deactivate();
    cleanupMockContext(context);
  });

  test("NIGHT_OWL_SESSIONS is only increased once per day", async () => {
    const first = new Date(2026, 0, 1, 1, 0, 0);
    const second = new Date(2026, 0, 1, 3, 0, 0);

    await timeListeners.trackTimeOfDaySession(first);
    await timeListeners.trackTimeOfDaySession(second);

    const progs = await ProgressionController.getProgressions();
    assert.strictEqual(progs[constants.criteria.NIGHT_OWL_SESSIONS], 1);
  });

  test("NIGHT_OWL_SESSIONS is increased again on a subsequent day", async () => {
    const day1 = new Date(2026, 0, 1, 1, 0, 0);
    const day2 = new Date(2026, 0, 2, 1, 0, 0);

    await timeListeners.trackTimeOfDaySession(day1);
    await timeListeners.trackTimeOfDaySession(day2);

    const progs = await ProgressionController.getProgressions();
    assert.strictEqual(progs[constants.criteria.NIGHT_OWL_SESSIONS], 2);
  });

  test("EARLY_BIRD_SESSIONS is only increased once per day", async () => {
    const first = new Date(2026, 0, 1, 5, 30, 0);
    const second = new Date(2026, 0, 1, 6, 45, 0);

    await timeListeners.trackTimeOfDaySession(first);
    await timeListeners.trackTimeOfDaySession(second);

    const progs = await ProgressionController.getProgressions();
    assert.strictEqual(progs[constants.criteria.EARLY_BIRD_SESSIONS], 1);
  });
});
