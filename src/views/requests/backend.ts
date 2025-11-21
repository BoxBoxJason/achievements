import { config } from "../../config/config";
import { constants } from "../../constants";
import { AchievementController } from "../../database/controller/achievements";
import { ProgressionController } from "../../database/controller/progressions";
import { TimeSpentController } from "../../database/controller/timespent";
import Achievement, {
  AchievementSelectRequestFilters,
} from "../../database/model/tables/Achievement";
import { PostMessage } from "../icons";
import { webview } from "../viewconst";
import * as vscode from "vscode";

export namespace backendRequests {
  export async function handleMessage(
    message: PostMessage,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    switch (message.command) {
      case webview.commands.RETRIEVE_ACHIEVEMENTS:
        await handleAchievementsSelect(message.data, panel);
        break;
      case webview.commands.RETRIEVE_ACHIEVEMENTS_FILTERS:
        await handleAchievementsSelectFilters(panel);
        break;
      case webview.commands.RETRIEVE_PROGRESSIONS:
        await handleProgressionsSelect(panel);
        break;
      case webview.commands.RETRIEVE_PROFILE:
        await handleProfileSelect(panel);
        break;
      default:
        console.error("Unknown command: " + message.command);
    }
  }

  export async function handleAchievementsSelect(
    filters: AchievementSelectRequestFilters | null,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    if (filters) {
      const achievements = await AchievementController.getAchievements(filters);
      panel.webview.postMessage({
        command: webview.commands.DISPLAY_ACHIEVEMENTS,
        data: achievements,
      });
    } else {
      return;
    }
  }

  export async function handleAchievementsSelectFilters(
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const filters = await AchievementController.getJsonFilters();
    panel.webview.postMessage({
      command: webview.commands.DISPLAY_ACHIEVEMENTS_FILTERS,
      data: filters,
    });
  }

  export async function handleProgressionsSelect(panel: vscode.WebviewPanel): Promise<void> {
    const progressions = await ProgressionController.getProgressions();
    panel.webview.postMessage({
      command: webview.commands.SET_PROGRESSIONS,
      data: progressions,
    });
  }

  export async function handleProfileSelect(panel: vscode.WebviewPanel): Promise<void> {
    const progressions = await ProgressionController.getProgressions() as {
      [key: string]: any;
    };
    panel.webview.postMessage({
      command: webview.commands.SET_PROFILE,
      data: {
        username: config.getUsername(),
        timeSpent: TimeSpentController.getTimeSpent(progressions),
        ...await Achievement.getAchievementStats(),
        totalExp: progressions[constants.criteria.EXP],
      },
    });
  }
}
