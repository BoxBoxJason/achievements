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
import { db_model } from "../model";

/**
 * Database init module functions
 *
 * @namespace db_init
 *
 * @function activate - Initializes the database with default achievements and progressions
 * @function removeObsoleteAchievements - Deletes the achievements that cannot be tracked anymore
 * @function createAchievementsFromStackingTemplates - Creates achievements from the stacking templates
 * @function createIntegerProgressions - Creates integer progressions
 */
export namespace db_init {
  /**
   * Progressions no listener can track anymore. They are deleted on every
   * startup along with the achievements based on them: a database shared
   * with an older version of the extension (devcontainers) gets them back
   * each time that version starts.
   *
   * @memberof db_init
   */
  export const OBSOLETE_PROGRESSIONS: readonly string[] = [
    // "Snippets Master": no stable VS Code API reports snippet insertions
    "codeSnippetsCount",
    // Never used: the git extension API does not report forced pushes
    "forcedPushesCount",
  ];

  /**
   * Deletes the obsolete progressions and every achievement based on them.
   * Foreign keys are not enforced, so dependent rows are deleted explicitly.
   *
   * @memberof db_init
   *
   * @returns {Promise<void>}
   */
  export async function removeObsoleteAchievements(): Promise<void> {
    const names = [...OBSOLETE_PROGRESSIONS];
    if (names.length === 0) {
      return;
    }
    const db = await db_model.getDB();
    const namePlaceholders = names.map(() => "?").join(", ");

    const progressions = db.exec(
      `SELECT id FROM progressions WHERE name IN (${namePlaceholders})`,
      names,
    );
    if (progressions.length === 0) {
      return; // Nothing to remove, the usual case
    }
    logger.info(`Removing obsolete progressions: ${names.join(", ")}`);

    db.run("BEGIN TRANSACTION");
    try {
      const result = db.exec(
        `SELECT DISTINCT c.achievement_id FROM achievement_criterias c
         JOIN progressions p ON p.id = c.progression_id
         WHERE p.name IN (${namePlaceholders})`,
        names,
      );
      const achievementIds = (result[0]?.values ?? []).map((row) =>
        Number(row[0]),
      );

      if (achievementIds.length > 0) {
        const idPlaceholders = achievementIds.map(() => "?").join(", ");
        db.run(
          `DELETE FROM achievement_labels WHERE achievement_id IN (${idPlaceholders})`,
          achievementIds,
        );
        db.run(
          `DELETE FROM achievement_requirements
           WHERE achievement_id IN (${idPlaceholders})
              OR requirement_id IN (${idPlaceholders})`,
          [...achievementIds, ...achievementIds],
        );
        db.run(
          `DELETE FROM achievement_criterias WHERE achievement_id IN (${idPlaceholders})`,
          achievementIds,
        );
        db.run(
          `DELETE FROM achievements WHERE id IN (${idPlaceholders})`,
          achievementIds,
        );
      }

      db.run(
        `DELETE FROM achievement_criterias WHERE progression_id IN (
           SELECT id FROM progressions WHERE name IN (${namePlaceholders})
         )`,
        names,
      );
      db.run(
        `DELETE FROM progressions WHERE name IN (${namePlaceholders})`,
        names,
      );
      db.run("COMMIT");
      db_model.scheduleSave();
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }
  }

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
    const progressions: Progression[] = [];

    for (const criteria of Object.values(constants.criteria)) {
      if (
        criteria !== constants.criteria.LINES_OF_CODE_LANGUAGE &&
        criteria !== constants.criteria.FILES_CREATED_LANGUAGE &&
        criteria !== constants.criteria.LAST_STREAK_DATE &&
        criteria !== constants.criteria.LAST_NIGHT_OWL_DATE &&
        criteria !== constants.criteria.LAST_EARLY_BIRD_DATE
      ) {
        const progression = new Progression({
          name: criteria,
          type: "integer",
          value: 0,
        });
        progressions.push(progression);
      } else if (
        criteria === constants.criteria.LAST_STREAK_DATE ||
        criteria === constants.criteria.LAST_NIGHT_OWL_DATE ||
        criteria === constants.criteria.LAST_EARLY_BIRD_DATE
      ) {
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
    await removeObsoleteAchievements();
    await createIntegerProgressions();
    await createAchievementsFromStackingTemplates();
    await Achievement.assignMissingChains();
    logger.info("Database populated successfully");
  }
}
