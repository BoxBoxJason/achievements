import { AchievementController } from "../../database/controller/achievements";
import { AchievementSelectRequestFilters } from "../../database/model/tables/Achievement";
import { PostMessage } from "../request";
import { webview } from "../viewconst";
import * as vscode from 'vscode';

export namespace backendRequests {

  export function handleMessage(message: PostMessage, panel: vscode.WebviewPanel): void {
    switch (message.command) {
      case webview.commands.RETRIEVE_ACHIEVEMENTS:
        handleAchievementsSelect(message.data, panel);
        break;
      case webview.commands.RETRIEVE_ACHIEVEMENTS_FILTERS:
        handleAchievementsSelectFilters(panel);
        break;
      default:
        console.error('Unknown command: ' + message.command);
    }
  }

  export function handleAchievementsSelect(filters: AchievementSelectRequestFilters | null, panel: vscode.WebviewPanel): void {
    if (filters) {
      const achievements = AchievementController.getAchievements(filters);
      panel.webview.postMessage({ command: webview.commands.DISPLAY_ACHIEVEMENTS, data: achievements });
    } else {
      return;
    }
  }

  export function handleAchievementsSelectFilters(panel: vscode.WebviewPanel): void {
    const filters = AchievementController.getJsonFilters();
    panel.webview.postMessage({ command: webview.commands.SET_ACHIEVEMENTS_FILTERS, data: filters });
  }

}
