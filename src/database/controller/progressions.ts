/**
 * Progressions Controller module
 *
 * @namespace ProgressionsController
 * @author BoxBoxJason
 */

import { awardAchievement } from "../../listeners/awarder";
import logger from "../../utils/logger";
import Progression from "../model/tables/Progression";

// ==================== TYPES ====================
export interface ProgressionDict {
  [key: string]: string | number | Date | boolean;
}

// ==================== MODULE FUNCTIONS ====================
/**
 * Progression Controller module functions
 * @namespace ProgressionController
 *
 * @function progressionsToObject - Convert a list of progressions to a dictionary
 * @function increaseProgression - Increase the progression value of a criteria and check if any achievements have been unlocked
 */
export namespace ProgressionController {
  /**
   * Convert a list of progressions to a dictionary
   *
   * @memberof achievements
   * @function progressionsToObject
   *
   * @param {Progression[]} progressions - The list of progressions to convert
   * @returns {Promise<ProgressionDict>} - The progressions as a dictionary
   */
  export async function getProgressions(): Promise<ProgressionDict> {
    const progressions = await Progression.getProgressions({});
    let progressionDict: ProgressionDict = Object();
    for (let progression of progressions) {
      progressionDict[progression.name] = progression.value;
    }

    return progressionDict;
  }

  /**
   * Increase the progression value of a criteria and check if any achievements have been unlocked
   *
   * @memberof achievements
   * @function increaseProgression
   *
   * @param {string} criteriaName - The name of the criteria to increase
   * @param {number} increase - The amount to increase the criteria by
   * @returns {Promise<void>}
   */
  export async function increaseProgression(
    criteriaName: string,
    increase: number | string = 1
  ): Promise<void> {
    // Update the progression value and retrieve all progressions
    try {
      const updatedProgressionsIds = await Progression.addValue(
        { name: criteriaName },
        increase
      );
      const updatedAchievements =
        await Progression.achieveCompletedAchievements(
          updatedProgressionsIds.map((progression) => progression.id)
        );
      let awardedPoints = 0;
      for (let achievement of updatedAchievements) {
        // Notify the user of the unlocked achievement
        awardAchievement(achievement);
      }
    } catch (error) {
      logger.error(
        `Failed to increase progression: ${(error as Error).message}`
      );
    }
  }

  /**
   * Update the progression value of a criteria and check if any achievements have been unlocked
   *
   * @memberof achievements
   * @function updateProgression
   *
   * @param {string} criteriaName - The name of the criteria to update
   * @param {string} value - The new value of the criteria
   * @returns {Promise<void>}
   */
  export async function updateProgression(
    criteriaName: string,
    value: string | number | Date | boolean,
    maximize: boolean = false
  ): Promise<void> {
    try {
      const updatedProgressionsIds = await Progression.updateValue(
        { name: criteriaName },
        value.toString(),
        maximize
      );
      const updatedAchievements =
        await Progression.achieveCompletedAchievements(
          updatedProgressionsIds.map((progression) => progression.id)
        );
      for (let achievement of updatedAchievements) {
        // Notify the user of the unlocked achievement
        awardAchievement(achievement);
      }
    } catch (error) {
      logger.error(`Failed to update progression: ${(error as Error).message}`);
    }
  }

  /**
   * Update multiple progression values and check if any achievements have been unlocked
   *
   * @memberof achievements
   * @function updateProgressions
   *
   * @param {Array<{name: string, value: string | number | Date | boolean}>} updates - The list of progressions to update
   * @returns {Promise<void>}
   */
  export async function updateProgressions(
    updates: Array<{
      name: string;
      value: string | number | Date | boolean;
      maximize?: boolean;
    }>
  ): Promise<void> {
    try {
      const allUpdatedIds: number[] = [];
      for (const update of updates) {
        const updatedProgressionsIds = await Progression.updateValue(
          { name: update.name },
          update.value.toString(),
          update.maximize
        );
        allUpdatedIds.push(...updatedProgressionsIds.map((p) => p.id));
      }

      if (allUpdatedIds.length > 0) {
        const updatedAchievements =
          await Progression.achieveCompletedAchievements(allUpdatedIds);
        for (let achievement of updatedAchievements) {
          awardAchievement(achievement);
        }
      }
    } catch (error) {
      logger.error(
        `Failed to update progressions: ${(error as Error).message}`
      );
    }
  }
}
