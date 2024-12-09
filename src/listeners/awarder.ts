/**
 * Achievement awarder processing module
 *
 * @module awarder
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { config } from '../config/config';
import logger from '../utils/logger';
import Progression from '../database/model/tables/Progression';
import { constants } from '../constants';

/**
 * Award an achievement to the user
 *
 * @param {string} achievement - Name of the achievement to award
 * @returns {void}
 */
export function awardAchievement(achievement : { id: number, title : string , exp: number , achievedAt : string}): void {
  if (config.notificationsEnabled()) {
    vscode.window.showInformationMessage(`🏆 Achievement unlocked: ${achievement.title}`, 'Browse Achievements')
      .then((selection) => {
        if (selection === 'Browse Achievements') {
          vscode.commands.executeCommand('achievements.show');
        }
      });
  }
  Progression.addValue({name: constants.criteria.EXP}, achievement.exp);
  logger.info(`Achievement unlocked: ${achievement.title} (${achievement.exp} exp)`);
}
