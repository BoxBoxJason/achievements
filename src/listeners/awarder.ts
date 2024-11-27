import * as vscode from 'vscode';

export function awardAchievement(achievement: string): void {
  vscode.window.showInformationMessage(`🏆 Achievement unlocked: ${achievement}`, 'Browse Achievements')
    .then((selection) => {
      if (selection === 'Browse Achievements') {
        vscode.commands.executeCommand('achievement.show');
      }
    });
}
