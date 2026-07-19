/**
 * Achievements controller contains functions to interact with achievements and progressions
 *
 * @namespace AchievementController
 * @author BoxBoxJason
 */

import { queries } from "../../views/viewconst";
import Achievement, {
  AchievementRow,
  AchievementSelectRequestFilters,
} from "../model/tables/Achievement";
import { ProgressionController, ProgressionDict } from "./progressions";

// ==================== MODULE FUNCTIONS ====================
/**
 * Achievement controller module
 * @namespace AchievementController
 *
 * @function getAchievableAchievementsByCriterias - Retrieve all achievements that are achievable by the given criterias
 * @function getAchievements - Retrieve achievements in a raw format given a set of filters
 * @function getJsonAchievements - Retrieve achievements in a raw format given a set of filters
 * @function getJsonFilters - Retrieve the categories, groups, and labels of all achievements
 * @function getClosestAchievableAchievement - Retrieve the unlocked achievement closest to completion, if any
 * @function getLatestAchievedAchievement - Retrieve the most recently unlocked, non-hidden achievement, if any
 * @function computeCompletionRatio - Compute how close an achievement's criteria are to being met
 * @function parseFilters - Parse the filters and set default values if necessary
 */
export namespace AchievementController {
  // ==================== GET FUNCTIONS ====================

  /**
   * Retrieve all achievements that are achievable by the given criterias
   *
   * @memberof achievements
   * @function getAchievableAchievementsByCriterias
   *
   * @param {string[]} criterias - The criterias to check against
   * @returns {Promise<{ count: number | null; achievements: Achievement[] }>} - The list of achievable achievements
   */
  export async function getAchievableAchievementsByCriterias(
    criterias: string[]
  ): Promise<{
    count: number | null;
    achievements: Achievement[];
  }> {
    return Achievement.getAchievements({
      achievable: true,
      criterias: criterias,
    });
  }

  /**
   * Retrieve achievements in a raw format given a set of filters
   *
   * @memberof achievements
   * @function getRawAchievements
   *
   * @param {AchievementSelectRequestFilters} filters - The filters to apply
   * @returns {Promise<{ count: number | null; achievements: Achievement[] }>} - The list of achievements
   * @throws {Error} - If the filters are invalid
   * @throws {Error} - If the sort criteria is invalid
   * @throws {Error} - If the sort direction is invalid
   * @throws {Error} - If the limit is negative
   */
  export async function getAchievements(
    filters: AchievementSelectRequestFilters
  ): Promise<{
    count: number | null;
    achievements: Achievement[];
  }> {
    filters = parseFilters(filters);
    return Achievement.getAchievements(filters);
  }

  /**
   * Retrieve achievements in a raw format given a set of filters
   *
   * @memberof achievements
   * @function getJsonAchievements
   *
   * @param {AchievementSelectRequestFilters} filters - The filters to apply
   * @returns {Promise<{ count: number | null; achievements: AchievementRow[] }>} - The list of achievements
   * @throws {Error} - If the filters are invalid
   * @throws {Error} - If the sort criteria is invalid
   * @throws {Error} - If the sort direction is invalid
   * @throws {Error} - If the limit is negative
   * @throws {Error} - If the offset is negative
   */
  export async function getJsonAchievements(
    filters: AchievementSelectRequestFilters
  ): Promise<{ count: number | null; achievements: AchievementRow[] }> {
    filters = parseFilters(filters);
    return Achievement.getAchievementsRawFormat(filters);
  }

  /**
   * Retrieve the categories, groups, and labels of all achievements
   *
   * @memberof achievements
   * @function getJsonFilters
   *
   * @returns {Promise<{categories: string[], groups: string[], labels: string[]}>} - The categories, groups, and labels
   */
  export async function getJsonFilters(): Promise<{
    categories: string[];
    groups: string[];
    labels: string[];
  }> {
    return {
      categories: await Achievement.getCategories(),
      groups: await Achievement.getGroups(),
      labels: await Achievement.getLabels(),
    };
  }

  /**
   * Compute how close an achievement's criteria are to being met, as a
   * ratio between 0 (untouched) and 1 (met). An achievement requires every
   * criterion to be met, so the ratio is the bottleneck (minimum) across
   * all of its criteria rather than an average.
   *
   * @memberof achievements
   * @function computeCompletionRatio
   *
   * @param {Object} criteria - The achievement's criteria, keyed by progression name
   * @param {ProgressionDict} progressions - The current progression values, keyed by name
   * @returns {number} - The completion ratio, between 0 and 1
   */
  export function computeCompletionRatio(
    criteria: { [key: string]: unknown },
    progressions: ProgressionDict,
  ): number {
    const requirements = Object.entries(criteria);
    if (requirements.length === 0) {
      return 0;
    }

    let ratio = 1;
    for (const [progressionName, requiredValue] of requirements) {
      const currentValue = progressions[progressionName];
      let criterionRatio: number;
      if (typeof requiredValue === "number") {
        const current = typeof currentValue === "number" ? currentValue : 0;
        criterionRatio =
          requiredValue <= 0 ? 1 : Math.min(1, Math.max(0, current / requiredValue));
      } else {
        // Non-numeric criteria (booleans, dates, strings) are treated as
        // binary: either the current value satisfies it or it doesn't.
        criterionRatio = currentValue === requiredValue ? 1 : 0;
      }
      ratio = Math.min(ratio, criterionRatio);
    }
    return ratio;
  }

  /**
   * Retrieve the not-yet-achieved, non-hidden achievement whose criteria
   * are closest to being met among those the user can currently work
   * towards (prerequisites already unlocked). Ties are broken randomly.
   *
   * @memberof achievements
   * @function getClosestAchievableAchievement
   *
   * @returns {Promise<{ achievement: Achievement; ratio: number } | undefined>} - The closest achievement and its completion ratio, if any
   */
  export async function getClosestAchievableAchievement(): Promise<
    { achievement: Achievement; ratio: number } | undefined
  > {
    const { achievements } = await getAchievements({
      achieved: false,
      hidden: false,
      achievable: true,
      limit: 1000,
    });
    if (achievements.length === 0) {
      return undefined;
    }

    const progressions = await ProgressionController.getProgressions();

    let bestRatio = -1;
    let bestAchievements: Achievement[] = [];
    for (const achievement of achievements) {
      const ratio = computeCompletionRatio(achievement.criteria, progressions);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestAchievements = [achievement];
      } else if (ratio === bestRatio) {
        bestAchievements.push(achievement);
      }
    }

    const picked =
      bestAchievements[Math.floor(Math.random() * bestAchievements.length)];
    return { achievement: picked, ratio: bestRatio };
  }

  /**
   * Retrieve the most recently unlocked, non-hidden achievement.
   *
   * @memberof achievements
   * @function getLatestAchievedAchievement
   *
   * @returns {Promise<Achievement | undefined>} - The most recently unlocked achievement, if any
   */
  export async function getLatestAchievedAchievement(): Promise<
    Achievement | undefined
  > {
    const { achievements } = await getAchievements({
      achieved: true,
      hidden: false,
      sortCriteria: "achievedAt",
      sortDirection: "DESC",
      limit: 1,
    });
    return achievements[0];
  }

  /**
   * Parse the filters and set default values if necessary
   *
   * @memberof achievements
   * @function parseFilters
   *
   * @param {AchievementSelectRequestFilters} filters - The filters to parse
   * @returns {AchievementSelectRequestFilters} - The parsed filters
   * @throws {Error} - If the sort criteria is invalid
   * @throws {Error} - If the sort direction is invalid
   * @throws {Error} - If the limit is negative
   * @throws {Error} - If the offset is negative
   */
  function parseFilters(
    filters: AchievementSelectRequestFilters
  ): AchievementSelectRequestFilters {
    // Set default values for filters
    // If the hidden filter is not provided, set it to false
    filters.hidden ??= false;

    // Set the default limit to 50
    if (filters.limit === undefined) {
      filters.limit = 50;
    } else if (filters.limit < 0) {
      throw new Error("Limit cannot be negative");
    }

    // Set the default offset to 0
    if (filters.offset === undefined) {
      filters.offset = 0;
    } else if (filters.offset < 0) {
      throw new Error("Offset cannot be negative");
    }

    // Set the default sort criteria to achieved
    if (filters.sortCriteria === undefined) {
      filters.sortCriteria = "achieved";
    } else {
      filters.sortCriteria = filters.sortCriteria.trim();
      if (!queries.VALID_SORT_CRITERIA.includes(filters.sortCriteria)) {
        throw new Error(`Invalid sort criteria: ${filters.sortCriteria}`);
      }
    }
    if (filters.sortDirection === undefined) {
      filters.sortDirection = "DESC";
    } else {
      filters.sortDirection = filters.sortDirection.trim().toUpperCase();
      if (filters.sortDirection !== "ASC" && filters.sortDirection !== "DESC") {
        throw new Error("Invalid sort direction");
      }
    }

    // Trim the title and check if it is empty
    if (filters.title !== undefined) {
      filters.title = filters.title.trim();
      if (filters.title === "") {
        delete filters.title;
      }
    }

    // Trim the category and check if it is empty
    if (filters.category !== undefined) {
      filters.category = filters.category.trim();
      if (filters.category === "") {
        delete filters.category;
      }
    }

    // Trim the group and check if it is empty
    if (filters.group !== undefined) {
      filters.group = filters.group.trim();
      if (filters.group === "") {
        delete filters.group;
      }
    }

    // Trim the criterias and check if they are empty
    if (filters.criterias !== undefined) {
      const trimmedCriterias: string[] = [];
      for (let criteria of filters.criterias) {
        criteria = criteria.trim();
        if (criteria !== "") {
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
      const trimmedLabels: string[] = [];
      for (let label of filters.labels) {
        label = label.trim();
        if (label !== "") {
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
