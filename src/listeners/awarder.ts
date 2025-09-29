/**
 * Achievement awarder processing module
 *
 * @module awarder
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { config } from "../config/config";
import logger from "../utils/logger";
import Progression from "../database/model/tables/Progression";
import { constants } from "../constants";

/**
 * Award an achievement to the user, logs and displays a notification
 *
 * @param {Object} achievement - The achievement to award
 * @returns {void}
 */
export function awardAchievement(achievement: {
  id: number;
  title: string;
  exp: number;
  achievedAt: string;
}): void {
  const message = `Achievement unlocked: ${achievement.title} (${achievement.exp} exp)`;
  if (config.notificationsEnabled()) {
    vscode.window
      .showInformationMessage(`🏆 ${message}`, "Browse Achievements")
      .then((selection) => {
        if (selection === "Browse Achievements") {
          vscode.commands.executeCommand("achievements.show");
        }
      });
  }
  Progression.addValue({ name: constants.criteria.EXP }, achievement.exp);
  logger.info(message);
}
