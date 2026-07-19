/**
 * Status bar entry point for the Achievements extension: a persistent
 * star icon that pops up a quick-glance progress menu on click.
 *
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { AchievementController } from "../database/controller/achievements";
import { ProgressionController } from "../database/controller/progressions";
import Achievement from "../database/model/tables/Achievement";
import { constants } from "../constants";
import logger from "../utils/logger";

export const STATUS_BAR_MENU_COMMAND = "achievements.statusBarMenu";

// ==================== TYPES ====================
export interface StatusBarData {
  available: boolean;
  unlockedCount: number;
  totalCount: number;
  totalExp: number;
  closest?: { title: string; ratio: number };
  latest?: { title: string; achievedAt: Date | undefined };
}

interface AchievementsMenuItem extends vscode.QuickPickItem {
  action?: "view" | "settings";
}

// A re-click on the status bar item while the menu is open first fires the
// QuickPick's blur/hide, then the command itself — so without this window
// the menu would immediately reopen instead of staying closed.
const RECLOSE_WINDOW_MS = 200;

/**
 * Formats a ratio (0-1) as a block-character progress bar with a trailing
 * percentage. QuickPick has no graphical progress widget, so this is the
 * text approximation used throughout the menu.
 *
 * @param {number} ratio - The completion ratio, between 0 and 1
 * @param {number} width - The number of characters in the bar
 * @returns {string} - The formatted progress bar
 */
export function formatProgressBar(ratio: number, width = 10): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  const filled = Math.round(clamped * width);
  const bar = "▰".repeat(filled) + "▱".repeat(width - filled);
  return `${bar} ${Math.round(clamped * 100)}%`;
}

/**
 * Gathers the data displayed in the status bar menu. Never throws: if the
 * database isn't available (extension disabled, read-only lock, etc.) the
 * returned data has `available: false` so the menu can degrade gracefully.
 *
 * @returns {Promise<StatusBarData>} - The status bar menu data
 */
export async function gatherStatusBarData(): Promise<StatusBarData> {
  try {
    const [
      { totalAchievements, achievedCount },
      progressions,
      closest,
      latest,
    ] = await Promise.all([
      Achievement.getAchievementStats(),
      ProgressionController.getProgressions(),
      AchievementController.getClosestAchievableAchievement(),
      AchievementController.getLatestAchievedAchievement(),
    ]);

    return {
      available: true,
      unlockedCount: achievedCount,
      totalCount: totalAchievements,
      totalExp: Number(progressions[constants.criteria.EXP]) || 0,
      closest: closest
        ? { title: closest.achievement.title, ratio: closest.ratio }
        : undefined,
      latest: latest
        ? { title: latest.title, achievedAt: latest.achievedAt }
        : undefined,
    };
  } catch (error) {
    logger.error("Failed to gather status bar data: " + String(error));
    return {
      available: false,
      unlockedCount: 0,
      totalCount: 0,
      totalExp: 0,
    };
  }
}

/**
 * Builds the QuickPick items for the status bar menu from already-gathered
 * data, in display order: actions first, then a progress overview.
 *
 * @param {StatusBarData} data - The status bar menu data
 * @returns {AchievementsMenuItem[]} - The QuickPick items to display
 */
export function buildMenuItems(data: StatusBarData): AchievementsMenuItem[] {
  const items: AchievementsMenuItem[] = [
    { label: "$(star-full) View Achievements", action: "view" },
    { label: "$(gear) Settings", action: "settings" },
    { label: "Progress", kind: vscode.QuickPickItemKind.Separator },
  ];

  if (!data.available) {
    items.push({
      label: "$(warning) Achievement tracking is disabled or unavailable",
    });
    return items;
  }

  items.push(
    {
      label: `$(check-all) ${data.unlockedCount}/${data.totalCount} achievements unlocked  ${formatProgressBar(
        data.totalCount === 0 ? 1 : data.unlockedCount / data.totalCount,
      )}`,
    },
    {
      label: `$(zap) ${data.totalExp} XP`,
    },
    {
      label: "Unlocking soon",
      kind: vscode.QuickPickItemKind.Separator,
    },
    {
      label: data.closest
        ? `$(target) ${data.closest.title}  ${formatProgressBar(data.closest.ratio)}`
        : "$(target) No achievement currently in progress",
    },
    {
      label: "Latest Achievement",
      kind: vscode.QuickPickItemKind.Separator,
    },
    {
      label: data.latest
        ? `$(sparkle) ${data.latest.title}${
            data.latest.achievedAt
              ? ` — ${data.latest.achievedAt.toLocaleDateString()}`
              : ""
          }`
        : "$(sparkle) No achievements unlocked yet",
    },
  );

  return items;
}

/**
 * Registers the status bar item and the command that toggles its quick
 * menu open/closed.
 *
 * @param {vscode.ExtensionContext} context - The extension context
 * @returns {void}
 */
export function registerAchievementsStatusBar(
  context: vscode.ExtensionContext,
): void {
  let quickPick: vscode.QuickPick<AchievementsMenuItem> | undefined;
  let lastHideTime = 0;

  const toggleCommand = vscode.commands.registerCommand(
    STATUS_BAR_MENU_COMMAND,
    async () => {
      if (quickPick) {
        quickPick.hide();
        return;
      }
      if (Date.now() - lastHideTime < RECLOSE_WINDOW_MS) {
        return;
      }

      const data = await gatherStatusBarData();
      const qp = vscode.window.createQuickPick<AchievementsMenuItem>();
      qp.items = buildMenuItems(data);
      qp.placeholder = "Achievements";

      qp.onDidAccept(() => {
        const [selected] = qp.selectedItems;
        qp.hide();
        if (selected?.action === "view") {
          vscode.commands.executeCommand("achievements.show");
        } else if (selected?.action === "settings") {
          vscode.commands.executeCommand("achievements.settings");
        }
      });
      qp.onDidHide(() => {
        lastHideTime = Date.now();
        quickPick = undefined;
        qp.dispose();
      });

      quickPick = qp;
      qp.show();
    },
  );
  context.subscriptions.push(toggleCommand);

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(star-full)";
  statusBarItem.tooltip = "Achievements";
  statusBarItem.command = STATUS_BAR_MENU_COMMAND;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}
