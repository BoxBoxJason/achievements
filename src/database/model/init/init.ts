/**
 * Database init module
 *
 * @namespace db_init
 * @description This module initializes the database with default achievements and progressions
 * @see Achievement
 * @see StackingTemplates
 * @see Progression
 * @see constants
 * @see logger
 * @author BoxBoxJason
 */

import Achievement from '../tables/Achievement';
import { StackingTemplates } from './StackingTemplates';
import Progression from '../tables/Progression';
import { constants } from '../../../constants';
import logger from '../../../utils/logger';

/**
 * Database init module functions
 *
 * @namespace db_init
 *
 * @function activate - Initializes the database with default achievements and progressions
 * @function createAchievementsFromStackingTemplates - Creates achievements from the stacking templates
 * @function createIntegerProgressions - Creates integer progressions
 */
export namespace db_init {

  /**
   * Creates default achievements from the stacking templates
   *
   * @memberof db_init
   *
   * @returns {void}
   */
  function createAchievementsFromStackingTemplates() {
    // Create the achievements from the stacking templates
    logger.debug('Creating achievements from stacking templates');

    //////////////////////// PRODUCTIVITY ////////////////////////
    // Lines of Code
    logger.debug('Creating lines of code achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.linesOfCodeTemplate());

    // Lines of Code for each language
    for (const template of StackingTemplates.productivity.linesOfCodeLanguageTemplates()) {
      logger.debug(`Creating lines of code achievements for ${template.title}`);
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
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.totalTimeSpentTemplate(), 3600);

    // Number of Simultaneous Tabs
    logger.debug('Creating number of simultaneous tabs achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.productivity.numberOfSimultaneousTabsTemplate());

    //////////////////////// FILES ////////////////////////
    // Files Created
    logger.debug('Creating files created achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.files.filesCreatedTemplate());

    // Files Created for Each Language
    for (const template of StackingTemplates.files.filesCreatedLanguageTemplates()) {
      logger.debug(`Creating files created achievements for ${template.title}`);
      Achievement.fromStackingTemplateToDB(template);
    }

    // Directories Created
    logger.debug('Creating directories created achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.files.directoriesCreatedTemplate());

    // Files Renamed
    logger.debug('Creating files renamed achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.files.filesRenamedCountTemplate());

    // Resources Deleted
    logger.debug('Creating resources deleted achievements');
    Achievement.fromStackingTemplateToDB(StackingTemplates.files.resourceDeletedTemplate());

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

    // // Forced Pushes
    // logger.debug('Creating forced pushes achievements');
    // Achievement.fromStackingTemplateToDB(StackingTemplates.git.forcedPushesTemplate());

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

  /**
   * Creates default integer progressions in the database
   *
   * @memberof db_init
   *
   * @returns {void}
   */
  function createIntegerProgressions() {
    logger.debug('Creating integer progressions');
    let progressions: Progression[] = [];

    for (const criteria of Object.values(constants.criteria)) {
      if (criteria !== constants.criteria.LINES_OF_CODE_LANGUAGE && criteria !== constants.criteria.FILES_CREATED_LANGUAGE) {
        const progression = new Progression({
          name: criteria,
          type: 'integer',
          value: 0,
        });
        progressions.push(progression);
      } else if (criteria === constants.criteria.LINES_OF_CODE_LANGUAGE) {
        for (const language of Object.values(constants.labels.LANGUAGES)) {
          const progression = new Progression({
            name: criteria.replace('%s', language),
            type: 'integer',
            value: 0,
          });
          progressions.push(progression);
        }
      } else if (criteria === constants.criteria.FILES_CREATED_LANGUAGE) {
        for (const language of Object.values(constants.labels.LANGUAGES)) {
          const progression = new Progression({
            name: criteria.replace('%s', language),
            type: 'integer',
            value: 0,
          });
          progressions.push(progression);
        }
      }
    }
    Progression.toDB(progressions);
  }

  /**
   * Initializes the database with default achievements and progressions
   *
   * @memberof db_init
   *
   * @returns {void}
   */
  export function activate() {
    logger.info('Populating database with default achievements and progressions');
    createIntegerProgressions();
    createAchievementsFromStackingTemplates();
    logger.info('Database populated successfully');
  }

}
