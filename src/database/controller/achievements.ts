/**
 * Achievements controller contains functions to interact with achievements and progressions
 *
 * @module achievements
 * @author BoxBoxJason
 * @date 2024-11-12
 */

import { queries } from '../../views/viewconst';
import Achievement, { AchievementRow, AchievementSelectRequestFilters } from '../model/tables/Achievement';

export namespace AchievementController {
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
  function getAchievableAchievementsByCriterias(criterias: string[]): { count : number | null, achievements: Achievement[]} {
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
  export function getAchievements(filters: AchievementSelectRequestFilters): { count : number | null, achievements: Achievement[]} {
    filters = parseFilters(filters);
    return Achievement.getAchievements(filters);
  }


  export function getJsonAchievements(filters: AchievementSelectRequestFilters): { count : number | null, achievements: AchievementRow[]} {
    filters = parseFilters(filters);
    return Achievement.getAchievementsRawFormat(filters);
  }

  export function getJsonFilters() : { categories: string[], groups: string[], labels: string[] } {
    return { categories: Achievement.getCategories(), groups: Achievement.getGroups(), labels: Achievement.getLabels()};
  }

  // ==================== PATCH FUNCTIONS ====================

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
      filters.sortCriteria = filters.sortCriteria.trim();
      if (!queries.VALID_SORT_CRITERIA.includes(filters.sortCriteria)) {
        throw new Error(`Invalid sort criteria: ${filters.sortCriteria}`);
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
