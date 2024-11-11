/**
 * Main function for creating achievements from stacking templates.
 */

import { join, dirname } from 'path';
import Achievement from './Achievement';
import {StackingAchievementTemplate} from './Achievement';
import { StackingTemplates } from './StackingTemplates';

const ACHIEVEMENTS_PATH = join(dirname(__filename), 'achievements.json');

function processTemplate(template: StackingAchievementTemplate) {
    Achievement.fromStackingTemplate(template);
}


function main() {
  // Create the achievements from the stacking templates

  //////////////////////// PRODUCTIVITY ////////////////////////
  // Lines of Code
  processTemplate(StackingTemplates.productivity.linesOfCodeTemplate());

  // Lines of Code for each language
  for (const template of StackingTemplates.productivity.linesOfCodeLanguageTemplates()) {
    processTemplate(template);
  }

  // Lines of Comments
  processTemplate(StackingTemplates.productivity.linesOfCommentTemplate());

  // Number of Pastes
  processTemplate(StackingTemplates.productivity.numberOfPastesTemplate());

  // Errors Fixed
  processTemplate(StackingTemplates.productivity.errorsFixedTemplate());

  // Time Spent Coding
  processTemplate(StackingTemplates.productivity.timeSpentTemplate());

  // Number of Simultaneous Tabs
  processTemplate(StackingTemplates.productivity.numberOfSimultaneousTabsTemplate());

  //////////////////////// FILES ////////////////////////
  // Files Created
  processTemplate(StackingTemplates.files.filesCreatedTemplate());

  // Files Created for Each Language
  for (const template of StackingTemplates.files.filesCreatedLanguageTemplates()) {
    processTemplate(template);
  }

  // Files Deleted
  processTemplate(StackingTemplates.files.filesDeletedTemplate());

  // Files Moved
  processTemplate(StackingTemplates.files.filesMovedTemplate());

  //////////////////////// GIT ////////////////////////
  // Commits
  processTemplate(StackingTemplates.git.commitsTemplate());

  // Branches Created
  processTemplate(StackingTemplates.git.branchesCreatedTemplate());

  // Merges and Rebases
  processTemplate(StackingTemplates.git.mergesAndRebasesTemplate());

  // Amends
  processTemplate(StackingTemplates.git.amendsTemplate());

  // Forced Pushes
  processTemplate(StackingTemplates.git.forcedPushesTemplate());

  // Pushes
  processTemplate(StackingTemplates.git.pushesTemplate());

  //////////////////////// VSCODE ////////////////////////
  // Extensions Installed
  processTemplate(StackingTemplates.vscode.extensionsInstalledTemplate());

  // Extensions Outdated
  processTemplate(StackingTemplates.vscode.extensionsOutdatedTemplate());

  // Themes Installed
  processTemplate(StackingTemplates.vscode.themesInstalledTemplate());

  // Save achievements to JSON file
  Achievement.toJsonFile(ACHIEVEMENTS_PATH);
}

main();
