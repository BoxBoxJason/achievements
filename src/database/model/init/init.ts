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
   * @async
   *
   * @returns {Promise<void>} - A promise that resolves when the achievements have been created
   */
  async function createAchievementsFromStackingTemplates(): Promise<void> {
    // Create the achievements from the stacking templates
    logger.debug('Creating achievements from stacking templates');

    // Common pool to collect promises
    const promises: Promise<void>[] = [];

    //////////////////////// PRODUCTIVITY ////////////////////////
    Object.entries(StackingTemplates.productivity).forEach(([name, func]) => {
      if (typeof func === 'function') {
        logger.debug(`Creating ${name} achievements`);

        const achievements = func();
        if (Array.isArray(achievements)) {
          achievements.forEach((achievement) => {
            promises.push(Achievement.fromStackingTemplateToDB(achievement));
          });
        } else if (achievements.group === 'time spent') {
          promises.push(Achievement.fromStackingTemplateToDB(achievements, 3600));
        } else {
          promises.push(Achievement.fromStackingTemplateToDB(achievements));
        }
      }
    });

    //////////////////////// GIT ////////////////////////
    Object.entries(StackingTemplates.git).forEach(([name, func]) => {
      if (typeof func === 'function') {
        logger.debug(`Creating ${name} achievements`);
        promises.push(Achievement.fromStackingTemplateToDB(func()));
      }
    });

    //////////////////////// VS CODE //////////////////
    Object.entries(StackingTemplates.vscode).forEach(([name, func]) => {
      if (typeof func === 'function') {
        logger.debug(`Creating ${name} achievements`);
        promises.push(Achievement.fromStackingTemplateToDB(func()));
      }
    });

    //////////////////////// FILES ////////////////////////
    Object.entries(StackingTemplates.files).forEach(([name, func]) => {
      if (typeof func === 'function') {
        logger.debug(`Creating ${name} achievements`);
        const achievements = func();
        if (Array.isArray(achievements)) {
          achievements.forEach((achievement) => {
            promises.push(Achievement.fromStackingTemplateToDB(achievement));
          });
        } else {
          promises.push(Achievement.fromStackingTemplateToDB(achievements));
        }
      }
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    logger.debug('Achievements from stacking templates have been created');
  }


  /**
   * Creates default integer progressions in the database
   *
   * @async
   *
   * @returns {Promise<void>} - A promise that resolves when the progressions have been created
   */
  async function createIntegerProgressions() : Promise<void> {
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
    await Progression.toDB(progressions);
  }

  /**
   * Initializes the database with default achievements and progressions
   *
   * @async
   *
   * @returns {Promise<void>} - A promise that resolves when the database has been activated
   */
  export async function activate() : Promise<void> {
    logger.info('Populating database with default achievements and progressions');
    await createIntegerProgressions();
    await createAchievementsFromStackingTemplates();
    logger.info('Database populated successfully');
  }

}
