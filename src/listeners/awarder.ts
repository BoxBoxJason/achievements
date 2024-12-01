/**
 * Achievement awarder processing module
 *
 * @module awarder
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';

/**
 * Award an achievement to the user
 *
 * @param {string} achievement - Name of the achievement to award
 * @returns {void}
 */
export function awardAchievement(achievement: string): void {
  vscode.window.showInformationMessage(`🏆 Achievement unlocked: ${achievement}`, 'Browse Achievements')
    .then((selection) => {
      if (selection === 'Browse Achievements') {
        vscode.commands.executeCommand('achievements.show');
      }
    });
}
