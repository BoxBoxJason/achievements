/**
 * Main function for creating achievements from stacking templates.
 */

import Achievement from '../tables/Achievement';
import { StackingTemplates } from './StackingTemplates';
import Progression from '../tables/Progression';
import { constants } from '../../../constants';
import logger from '../../../logger/logger';


export namespace db_init {

  function createAchievementsFromStackingTemplates() {
    // Create the achievements from the stacking templates
    logger.debug('Creating achievements from stacking templates');

    //////////////////////// PRODUCTIVITY ////////////////////////
    // Lines of Code
    logger.debug('Creating lines of code achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.linesOfCodeTemplate());

    // Lines of Code for each language
    for (const template of StackingTemplates.productivity.linesOfCodeLanguageTemplates()) {
      logger.debug(`Creating lines of code achievements for ${template.name}`);
      Achievement.fromStackingTemplateToDB(template);
    }

    // Lines of Comments
    logger.debug('Creating lines of comments achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.linesOfCommentTemplate());

    // Number of Pastes
    logger.debug('Creating number of pastes achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.numberOfPastesTemplate());

    // Errors Fixed
    logger.debug('Creating errors fixed achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.errorsFixedTemplate());

    // Time Spent Coding
    logger.debug('Creating time spent coding achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.timeSpentTemplate());

    // Number of Simultaneous Tabs
    logger.debug('Creating number of simultaneous tabs achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.numberOfSimultaneousTabsTemplate());

    //////////////////////// FILES ////////////////////////
    // Files Created
    logger.debug('Creating files created achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.files.filesCreatedTemplate());

    // Files Created for Each Language
    for (const template of StackingTemplates.files.filesCreatedLanguageTemplates()) {
      logger.debug(`Creating files created achievements for ${template.name}`);
      Achievement.fromStackingTemplateToDB(template);
    }

    // Files Deleted
    logger.debug('Creating files deleted achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.files.filesDeletedTemplate());

    // Files Moved
    logger.debug('Creating files moved achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.files.filesMovedTemplate());

    //////////////////////// GIT ////////////////////////
    // Commits
    logger.debug('Creating commits achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.git.commitsTemplate());

    // Branches Created
    logger.debug('Creating branches created achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.git.branchesCreatedTemplate());

    // Merges and Rebases
    logger.debug('Creating merges and rebases achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.git.mergesAndRebasesTemplate());

    // Amends
    logger.debug('Creating amends achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.git.amendsTemplate());

    // Forced Pushes
    logger.debug('Creating forced pushes achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.git.forcedPushesTemplate());

    // Pushes
    logger.debug('Creating pushes achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.git.pushesTemplate());

    //////////////////////// VSCODE ////////////////////////
    // Extensions Installed
    logger.debug('Creating extensions installed achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.vscode.extensionsInstalledTemplate());

    // Extensions Outdated
    logger.debug('Creating extensions outdated achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.vscode.extensionsOutdatedTemplate());

    // Themes Installed
    logger.debug('Creating themes installed achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.vscode.themesInstalledTemplate());
  }

  function createIntegerProgressions() {
    logger.debug('Creating integer progressions');
    for (const criteria of Object.values(constants.criteria)) {
      if (criteria !== constants.criteria.LINES_OF_CODE_LANGUAGE) {
        const progression = new Progression({
          name: criteria,
        });
        progression.toRow();
      } else {
        for (const language of constants.labels.LANGUAGES) {
          const progression = new Progression({
            name: criteria.replace('%s', language),
          });
          progression.toRow();
        }
      }
    }
  }

  export function activate() {
    logger.info('Populating database with default achievements and progressions');
    createIntegerProgressions();
    createAchievementsFromStackingTemplates();
    logger.info('Database populated successfully');
  }

}