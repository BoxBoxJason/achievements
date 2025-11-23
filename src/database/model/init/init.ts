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
   * @returns {Promise<void>}
   */
  async function createAchievementsFromStackingTemplates(): Promise<void> {
    // Create the achievements from the stacking templates
    logger.debug("Creating achievements from stacking templates");

    //////////////////////// PRODUCTIVITY ////////////////////////
    for (const [name, func] of Object.entries(StackingTemplates.productivity)) {
      if (typeof func === "function") {
        logger.debug(`Creating ${name} achievements`);

        const achievements = func();
        if (Array.isArray(achievements)) {
          for (const achievement of achievements) {
            await Achievement.fromStackingTemplateToDB(achievement);
          }
        } else if (achievements.group === "time spent") {
          await Achievement.fromStackingTemplateToDB(achievements, 3600);
        } else {
          await Achievement.fromStackingTemplateToDB(achievements);
        }
      }
    }

    //////////////////////// GIT ////////////////////////
    for (const [name, func] of Object.entries(StackingTemplates.git)) {
      if (typeof func === "function") {
        logger.debug(`Creating ${name} achievements`);
        await Achievement.fromStackingTemplateToDB(func());
      }
    }

    //////////////////////// VS CODE //////////////////
    for (const [name, func] of Object.entries(StackingTemplates.vscode)) {
      if (typeof func === "function") {
        logger.debug(`Creating ${name} achievements`);
        await Achievement.fromStackingTemplateToDB(func());
      }
    }

    //////////////////////// FILES ////////////////////////
    for (const [name, func] of Object.entries(StackingTemplates.files)) {
      if (typeof func === "function") {
        logger.debug(`Creating ${name} achievements`);
        const achievements = func();
        if (Array.isArray(achievements)) {
          for (const achievement of achievements) {
            await Achievement.fromStackingTemplateToDB(achievement);
          }
        } else {
          await Achievement.fromStackingTemplateToDB(achievements);
        }
      }
    }
  }

  /**
   * Creates default integer progressions in the database
   *
   * @memberof db_init
   *
   * @returns {Promise<void>}
   */
  async function createIntegerProgressions(): Promise<void> {
    logger.debug("Creating integer progressions");
    let progressions: Progression[] = [];

    for (const criteria of Object.values(constants.criteria)) {
      if (
        criteria !== constants.criteria.LINES_OF_CODE_LANGUAGE &&
        criteria !== constants.criteria.FILES_CREATED_LANGUAGE &&
        criteria !== constants.criteria.LAST_STREAK_DATE
      ) {
        const progression = new Progression({
          name: criteria,
          type: "integer",
          value: 0,
        });
        progressions.push(progression);
      } else if (criteria === constants.criteria.LAST_STREAK_DATE) {
        const progression = new Progression({
          name: criteria,
          type: "string",
          value: "",
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
    await Progression.toDB(progressions);
  }

  /**
   * Initializes the database with default achievements and progressions
   *
   * @memberof db_init
   *
   * @returns {Promise<void>}
   */
  export async function activate(): Promise<void> {
    logger.info(
      "Populating database with default achievements and progressions"
    );
    await createIntegerProgressions();
    await createAchievementsFromStackingTemplates();
    logger.info("Database populated successfully");
  }
}
