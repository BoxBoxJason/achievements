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

import Achievement from "../tables/Achievement";
import { StackingTemplates } from "./StackingTemplates";
import Progression from "../tables/Progression";
import { constants } from "../../../constants";
import logger from "../../../utils/logger";

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
    logger.debug("Creating achievements from stacking templates");

    //////////////////////// PRODUCTIVITY ////////////////////////
    Object.entries(StackingTemplates.productivity).forEach(([name, func]) => {
      if (typeof func === "function") {
        logger.debug(`Creating ${name} achievements`);

        const achievements = func();
        if (Array.isArray(achievements)) {
          for (const achievement of achievements) {
            Achievement.fromStackingTemplateToDB(achievement);
          }
        } else if (achievements.group === "time spent") {
          Achievement.fromStackingTemplateToDB(achievements, 3600);
        } else {
          Achievement.fromStackingTemplateToDB(achievements);
        }
      }
    });

    //////////////////////// GIT ////////////////////////
    Object.entries(StackingTemplates.git).forEach(([name, func]) => {
      if (typeof func === "function") {
        logger.debug(`Creating ${name} achievements`);
        Achievement.fromStackingTemplateToDB(func());
      }
    });

    //////////////////////// VS CODE //////////////////
    Object.entries(StackingTemplates.vscode).forEach(([name, func]) => {
      if (typeof func === "function") {
        logger.debug(`Creating ${name} achievements`);
        Achievement.fromStackingTemplateToDB(func());
      }
    });

    //////////////////////// FILES ////////////////////////
    Object.entries(StackingTemplates.files).forEach(([name, func]) => {
      if (typeof func === "function") {
        logger.debug(`Creating ${name} achievements`);
        const achievements = func();
        if (Array.isArray(achievements)) {
          for (const achievement of achievements) {
            Achievement.fromStackingTemplateToDB(achievement);
          }
        } else {
          Achievement.fromStackingTemplateToDB(achievements);
        }
      }
    });
  }

  /**
   * Creates default integer progressions in the database
   *
   * @memberof db_init
   *
   * @returns {void}
   */
  function createIntegerProgressions() {
    logger.debug("Creating integer progressions");
    let progressions: Progression[] = [];

    for (const criteria of Object.values(constants.criteria)) {
      if (
        criteria !== constants.criteria.LINES_OF_CODE_LANGUAGE &&
        criteria !== constants.criteria.FILES_CREATED_LANGUAGE
      ) {
        const progression = new Progression({
          name: criteria,
          type: "integer",
          value: 0,
        });
        progressions.push(progression);
      } else if (criteria === constants.criteria.LINES_OF_CODE_LANGUAGE) {
        for (const language of Object.values(constants.labels.LANGUAGES)) {
          const progression = new Progression({
            name: criteria.replace("%s", language),
            type: "integer",
            value: 0,
          });
          progressions.push(progression);
        }
      } else if (criteria === constants.criteria.FILES_CREATED_LANGUAGE) {
        for (const language of Object.values(constants.labels.LANGUAGES)) {
          const progression = new Progression({
            name: criteria.replace("%s", language),
            type: "integer",
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
    logger.info(
      "Populating database with default achievements and progressions"
    );
    createIntegerProgressions();
    createAchievementsFromStackingTemplates();
    logger.info("Database populated successfully");
  }
}
