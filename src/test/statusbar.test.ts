import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  STATUS_BAR_MENU_COMMAND,
  buildMenuItems,
  formatProgressBar,
  gatherStatusBarData,
  registerAchievementsStatusBar,
  StatusBarData,
} from "../views/statusbar";
import { getMockContext, cleanupMockContext } from "./utils";
import { db_model } from "../database/model/model";
import { db_lock } from "../database/lock";

suite("Status Bar Test Suite", () => {
  let context: vscode.ExtensionContext;

  setup(() => {
    context = getMockContext();
  });

  teardown(() => {
    for (const subscription of context.subscriptions) {
      (subscription as vscode.Disposable | undefined)?.dispose?.();
    }
    cleanupMockContext(context);
  });

  test("formatProgressBar should render a clamped block bar with a percentage", () => {
    assert.strictEqual(formatProgressBar(0, 4), "▱▱▱▱ 0%");
    assert.strictEqual(formatProgressBar(1, 4), "▰▰▰▰ 100%");
    assert.strictEqual(formatProgressBar(0.5, 4), "▰▰▱▱ 50%");
    // Out-of-range ratios are clamped rather than producing garbage
    assert.strictEqual(formatProgressBar(-1, 4), "▱▱▱▱ 0%");
    assert.strictEqual(formatProgressBar(2, 4), "▰▰▰▰ 100%");
  });

  test("buildMenuItems should always lead with the View/Settings actions", () => {
    const data: StatusBarData = {
      available: true,
      unlockedCount: 3,
      totalCount: 10,
      totalExp: 150,
      closest: { title: "Creator 1", ratio: 0.5 },
      latest: { title: "Code Monkey 1", achievedAt: new Date("2026-01-01") },
    };

    const items = buildMenuItems(data);
    assert.strictEqual(items[0].action, "view");
    assert.strictEqual(items[1].action, "settings");
    assert.strictEqual(items[2].kind, vscode.QuickPickItemKind.Separator);

    const labels = items.map((item) => item.label);
    assert.ok(labels.some((label) => label.includes("3/10")));
    assert.ok(labels.some((label) => label.includes("150 XP")));
    assert.ok(labels.some((label) => label.includes("Creator 1")));
    assert.ok(labels.some((label) => label.includes("Code Monkey 1")));
  });

  test("buildMenuItems should fall back to friendly placeholders when data is missing", () => {
    const data: StatusBarData = {
      available: true,
      unlockedCount: 0,
      totalCount: 0,
      totalExp: 0,
    };

    const items = buildMenuItems(data);
    const labels = items.map((item) => item.label);
    assert.ok(labels.some((label) => label.includes("No achievement currently in progress")));
    assert.ok(labels.some((label) => label.includes("No achievements unlocked yet")));
  });

  test("buildMenuItems should show a single unavailable notice when data could not be gathered", () => {
    const data: StatusBarData = {
      available: false,
      unlockedCount: 0,
      totalCount: 0,
      totalExp: 0,
    };

    const items = buildMenuItems(data);
    const labels = items.map((item) => item.label);
    assert.ok(labels.some((label) => label.includes("unavailable")));
    // Only the two actions plus the header plus the single notice
    assert.strictEqual(items.length, 4);
  });

  test("gatherStatusBarData should reflect the current achievement/progression state", async () => {
    const dbPath = path.join(context.globalStorageUri.fsPath, "test.sqlite");
    db_lock._resetState();
    db_model._resetState();
    await db_model.activate(context, dbPath);

    try {
      const data = await gatherStatusBarData();
      assert.strictEqual(data.available, true);
      assert.ok(data.totalCount > 0);
      assert.strictEqual(data.unlockedCount, 0);
      assert.strictEqual(data.totalExp, 0);
      assert.ok(data.closest);
      assert.strictEqual(data.latest, undefined);
    } finally {
      await db_model.deactivate();
    }
  });

  test("gatherStatusBarData should degrade gracefully when the database is unavailable", async () => {
    db_lock._resetState();
    db_model._resetState();

    const data = await gatherStatusBarData();
    assert.strictEqual(data.available, false);
    assert.strictEqual(data.totalCount, 0);
    assert.strictEqual(data.unlockedCount, 0);
    assert.strictEqual(data.totalExp, 0);
    assert.strictEqual(data.closest, undefined);
    assert.strictEqual(data.latest, undefined);
  });

  test("registerAchievementsStatusBar should create a star status bar item wired to the toggle command", () => {
    registerAchievementsStatusBar(context);

    const item = context.subscriptions.find(
      (s: any) => s && typeof s.text === "string" && s.text === "$(star-full)",
    ) as vscode.StatusBarItem | undefined;

    assert.ok(item, "star status bar item should be registered");
    assert.strictEqual(item?.command, STATUS_BAR_MENU_COMMAND);
  });

  test("the toggle command should open and close the menu without throwing", async () => {
    registerAchievementsStatusBar(context);

    await vscode.commands.executeCommand(STATUS_BAR_MENU_COMMAND);
    await vscode.commands.executeCommand(STATUS_BAR_MENU_COMMAND);
  });
});
