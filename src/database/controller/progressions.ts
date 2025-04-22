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
   * Returns an Object containing all progressions and their values
   *
   * @async
   *
   * @returns {Promise<ProgressionDict>} - A promise that resolves to an object containing all progressions and their values
   * @throws {Error} - If there is an error retrieving the progressions
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
 * @async
 *
 * @param {string} criteriaName - The name of the criteria to increase
 * @param {number | string} [increase=1] - The amount to increase the criteria by (default is 1)
 *
 * @returns {Promise<void>} - A promise that resolves when the progression has been increased
 */
  export async function increaseProgression(criteriaName: string, increase: number | string = 1): Promise<void> {
    // Update the progression value and retrieve all progressions
    try {
      const updatedProgressionsIds = await Progression.addValue({ name: criteriaName }, increase);
      const updatedAchievements = await Progression.achieveCompletedAchievements(updatedProgressionsIds.map((progression) => progression.id));
      for (let achievement of updatedAchievements) {
        // Notify the user of the unlocked achievement
        awardAchievement(achievement);
      }
    } catch (error) {
      logger.error(`Failed to increase progression: ${(error as Error).message}`);
    }
  }

  /**
   * Update the progression value of a criteria and check if any achievements have been unlocked
   *
   * @async
   *
   * @param {string} criteriaName - The name of the criteria to update
   * @param {string | number | Date | boolean} value - The new value to set for the criteria
   * @param {boolean} [maximize=false] - Whether to maximize the value (default is false)
   *
   * @returns {Promise<void>} - A promise that resolves when the progression has been updated
   */
  export async function updateProgression(criteriaName: string, value: string | number | Date | boolean, maximize : boolean = false): Promise<void> {
    try {
      const updatedProgressionsIds = await Progression.updateValue({ name: criteriaName }, value.toString(), maximize);
      const updatedAchievements = await Progression.achieveCompletedAchievements(updatedProgressionsIds.map((progression) => progression.id));
      for (let achievement of updatedAchievements) {
        // Notify the user of the unlocked achievement
        awardAchievement(achievement);
      }
    } catch (error) {
      logger.error(`Failed to update progression: ${(error as Error).message}`);
    }
  }
}
