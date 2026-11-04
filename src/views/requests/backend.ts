import { config } from "../../config/config";
import { constants } from "../../constants";
import { AchievementController } from "../../database/controller/achievements";
import { ProgressionController } from "../../database/controller/progressions";
import { TimeSpentController } from "../../database/controller/timespent";
import Achievement, {
  AchievementChainSelectRequestFilters,
} from "../../database/model/tables/Achievement";
import { PostMessage } from "../icons";
import { webview } from "../viewconst";
import * as vscode from "vscode";
import logger from "../../utils/logger";

export namespace backendRequests {
  export async function handleMessage(
    message: PostMessage,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    switch (message.command) {
      case webview.commands.RETRIEVE_ACHIEVEMENT_CHAINS:
        await handleAchievementChainsSelect(
          (message.data ?? null) as AchievementChainSelectRequestFilters | null,
          panel,
        );
        break;
      case webview.commands.RETRIEVE_ACHIEVEMENT_CHAIN_TIERS:
        await handleAchievementChainTiersSelect(
          (message.data ?? null) as { chain?: unknown; hidden?: unknown } | null,
          panel,
        );
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
        logger.error("Unknown command: " + message.command);
    }
  }

  export async function handleAchievementChainsSelect(
    filters: AchievementChainSelectRequestFilters | null,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    if (!filters) {
      return;
    }
    const chains = await AchievementController.getJsonAchievementChains(filters);
    panel.webview.postMessage({
      command: webview.commands.DISPLAY_ACHIEVEMENT_CHAINS,
      data: { ...chains, requestId: filters.requestId },
    });
  }

  export async function handleAchievementChainTiersSelect(
    data: { chain?: unknown; hidden?: unknown } | null,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    if (typeof data?.chain !== "string" || data.chain === "") {
      return;
    }
    const tiers = await AchievementController.getJsonChainTiers(
      data.chain,
      typeof data.hidden === "boolean" ? data.hidden : undefined,
    );
    panel.webview.postMessage({
      command: webview.commands.DISPLAY_ACHIEVEMENT_CHAIN_TIERS,
      data: { chain: data.chain, tiers },
    });
  }

  export async function handleAchievementsSelectFilters(
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const filters = await AchievementController.getJsonFilters();
    panel.webview.postMessage({
      command: webview.commands.DISPLAY_ACHIEVEMENTS_FILTERS,
      data: filters,
    });
  }

  export async function handleProgressionsSelect(
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const progressions = await ProgressionController.getProgressions();
    panel.webview.postMessage({
      command: webview.commands.SET_PROGRESSIONS,
      data: progressions,
    });
  }

  export async function handleProfileSelect(
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const progressions = (await ProgressionController.getProgressions()) as {
      [key: string]: number;
    };
    panel.webview.postMessage({
      command: webview.commands.SET_PROFILE,
      data: {
        username: config.getUsername(),
        timeSpent: TimeSpentController.getTimeSpent(progressions),
        ...(await Achievement.getAchievementStats()),
        totalExp: progressions[constants.criteria.EXP],
      },
    });
  }
}
