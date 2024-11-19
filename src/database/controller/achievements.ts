/**
 * Achievements controller contains functions to interact with achievements and progressions
 *
 * @module achievements
 * @author BoxBoxJason
 * @date 2024-11-12
 */

import Achievement, { AchievementSelectRequestFilters } from '../model/tables/Achievement';
import Progression from '../model/tables/Progression';

interface ProgressionDict {
  [key: string]: number;
}

export namespace AchievementController {

  const VALID_SORT_CRITERIA = ['achieved', 'title', 'category', 'group', 'achievedAt', 'tier', 'points'];

  // ==================== GET FUNCTIONS ====================

  /**
   * Retrieve all achievements that are achievable by the given criterias
   *
   * @memberof achievements
   * @function getAchievableAchievementsByCriterias
   *
   * @param {string[]} criterias - The criterias to check against
   * @returns {Achievement[]} - The list of achievable achievements
   */
  function getAchievableAchievementsByCriterias(criterias: string[]): Achievement[] {
    return Achievement.getAchievements({ achievable: true, criterias: criterias });
  }

  /**
   * Retrieve achievements in a raw format given a set of filters
   *
   * @memberof achievements
   * @function getRawAchievements
   *
   * @param {AchievementSelectRequestFilters} filters - The filters to apply
   * @returns {Achievement[]} - The list of achievements
   */
  export function getAchievements(filters: AchievementSelectRequestFilters): Achievement[] {
    filters = parseFilters(filters);
    return Achievement.getAchievements(filters);
  }


  export function getJsonAchievements(filters: AchievementSelectRequestFilters): unknown[] {
    filters = parseFilters(filters);
    return Achievement.getAchievementsRawFormat(filters);
  }

  /**
 * Check if an achievement has been completed
 *
 * @memberof achievements
 * @function checkAchievementDone
 *
 * @param {Achievement} achievement - The achievement to check
 * @param {ProgressionDict} progressions - The progressions to check against
 * @returns {boolean} - True if the achievement has been completed
 */
  function checkAchievementDone(achievement: Achievement, progressions: ProgressionDict): boolean {
    return Object.keys(achievement.criteria).every(
      criterion => progressions[criterion] >= achievement.criteria[criterion]
    );
  }
  // ==================== PATCH FUNCTIONS ====================
  /**
   * Increase the progression value of a criteria and check if any achievements have been unlocked
   *
   * @memberof achievements
   * @function increaseProgression
   *
   * @param {string} criteria_name - The name of the criteria to increase
   * @param {number} increase - The amount to increase the criteria by
   * @returns {void}
   */
  export function increaseProgression(criteria_name: string, increase: number): void {
    // Update the progression value and retrieve all progressions
    Progression.addValueFromName(criteria_name, increase);
    let criterias = progressionsToObject(Progression.fromDB());

    // Retrieve the achievements that are achievable by the updated progression
    let achievableAchievements = getAchievableAchievementsByCriterias([criteria_name]);

    // Check if the updated progression has unlocked any achievements
    let unlockedAchievements = achievableAchievements.filter(
      achievement => checkAchievementDone(achievement, criterias)
    );

    // Complete the unlocked achievements
    for (let achievement of unlockedAchievements) {
      achievement.updateAchieved();
    }
  }


  /**
   * Convert a list of progressions to a dictionary
   *
   * @memberof achievements
   * @function progressionsToObject
   *
   * @param {Progression[]} progressions - The list of progressions to convert
   * @returns {ProgressionDict} - The progressions as a dictionary
   */
  function progressionsToObject(progressions: Progression[]): ProgressionDict {
    let progressionDict: ProgressionDict = Object();
    for (let progression of progressions) {
      progressionDict[progression.name] = progression.value;
    }
    return progressionDict;
  }

  function parseFilters(filters: AchievementSelectRequestFilters): AchievementSelectRequestFilters {
    // Set default values for filters
    // If the hidden filter is not provided, set it to false
    if (filters.hidden === undefined) {
      filters.hidden = false;
    }

    // Set the default limit to 50
    if (filters.limit === undefined) {
      filters.limit = 50;
    } else if (filters.limit < 0) {
      throw new Error('Limit cannot be negative');
    }

    // Set the default offset to 0
    if (filters.offset === undefined) {
      filters.offset = 0;
    } else if (filters.offset < 0) {
      throw new Error('Offset cannot be negative');
    }

    // Set the default sort criteria to achieved
    if (filters.sortCriteria === undefined) {
      filters.sortCriteria = 'achieved';
    } else {
      filters.sortCriteria = filters.sortCriteria.trim().toLowerCase();
      if (!VALID_SORT_CRITERIA.includes(filters.sortCriteria)) {
        throw new Error('Invalid sort criteria');
      }
    }
    if (filters.sortDirection === undefined) {
      filters.sortDirection = 'DESC';
    } else {
      filters.sortDirection = filters.sortDirection.trim().toUpperCase();
      if (filters.sortDirection !== 'ASC' && filters.sortDirection !== 'DESC') {
        throw new Error('Invalid sort direction');
      }
    }

    // Trim the title and check if it is empty
    if (filters.title !== undefined) {
      filters.title = filters.title.trim();
      if (filters.title === '') {
        delete filters.title;
      }
    }

    // Trim the category and check if it is empty
    if (filters.category !== undefined) {
      filters.category = filters.category.trim();
      if (filters.category === '') {
        delete filters.category;
      }
    }

    // Trim the group and check if it is empty
    if (filters.group !== undefined) {
      filters.group = filters.group.trim();
      if (filters.group === '') {
        delete filters.group;
      }
    }

    // Trim the criterias and check if they are empty
    if (filters.criterias !== undefined) {
      let trimmedCriterias: string[] = [];
      for (let criteria of filters.criterias) {
        criteria = criteria.trim();
        if (criteria !== '') {
          trimmedCriterias.push(criteria);
        }
      }
      if (trimmedCriterias.length === 0) {
        delete filters.criterias;
      } else {
        filters.criterias = trimmedCriterias;
      }
    }

    // Trim the labels and check if they are empty
    if (filters.labels !== undefined) {
      let trimmedLabels: string[] = [];
      for (let label of filters.labels) {
        label = label.trim();
        if (label !== '') {
          trimmedLabels.push(label);
        }
      }
      if (trimmedLabels.length === 0) {
        delete filters.labels;
      } else {
        filters.labels = trimmedLabels;
      }
    }
    return filters;
  }
}
