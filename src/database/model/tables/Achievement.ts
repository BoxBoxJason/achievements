/**
 * Achievement class definition and methods, used for database operations
 *
 * @class Achievement
 * @author BoxBoxJason
 */

import * as path from 'path';
import { db_model } from '../model';
import { parseValue } from '../../../utils/types';

// ==================== TYPES ====================

// Stacking achievement template, used to create a list of achievements
export interface StackingAchievementTemplate {
  title: string;
  icon: string;
  category: string;
  group: string;
  labels: string[];
  criterias: string[];
  criteriasFunctions: ((tier: number) => any)[];
  description: string;
  minTier: number;
  maxTier: number;
  expFunction: (tier: number) => number;
  hidden: boolean;
  requires: number[];
}
// Achievement dictionary, used to create an achievement
export interface AchievementDict {
  id?: number;
  title: string;
  icon: string;
  category: string;
  group: string;
  labels: string[];
  criteria: { [key: string]: any };
  description: string;
  tier: number;
  exp: number;
  hidden: boolean;
  requires: number[];
  repeatable: boolean;
  achieved?: boolean;
  achievedAt?: Date;
}
// Achievement select request filters, used to filter achievements
export interface AchievementSelectRequestFilters {
  offset?: number;
  limit?: number;
  category?: string;
  group?: string;
  labels?: string[];
  title?: string;
  criterias?: string[];
  achieved?: boolean;
  hidden?: boolean;
  achievable?: boolean;
  sortCriteria?: string;
  sortDirection?: string;
  count?: boolean;
}
// Achievement row, used to represent an achievement row from the database
interface RawAchievementRow {
  id: number;
  title: string;
  icon: string;
  category: string;
  group: string;
  labels: string;
  description: string;
  tier: number;
  exp: number;
  hidden: boolean;
  achieved: boolean;
  achievedAt: string | null;
  repeatable: boolean;
  requirements: string;
  criteria: string;
}
// Achievement row, used to represent an achievement row from the database
export interface AchievementRow {
  id: number;
  title: string;
  icon: string;
  category: string;
  group: string;
  labels: string[];
  description: string;
  tier: number;
  exp: number;
  hidden: boolean;
  achieved: boolean;
  achievedAt: string | null;
  repeatable: boolean;
  requirements: number[];
  criteria: Array<{
    progression_name: string;
    required_value: any;
    type: string;
  }>;
}

/**
 * Achievement class, contains the information of an achievement and its processing methods
 *
 * @class Achievement
 *
 * @property {number} id - The unique identifier of the achievement
 * @property {string} title - The title of the achievement
 * @property {string} icon - The path to the icon of the achievement
 * @property {string} category - The category of the achievement
 * @property {string} group - The group of the achievement
 * @property {string[]} labels - The labels of the achievement
 * @property {Criteria} criteria - The criteria of the achievement
 * @property {string} description - The description of the achievement
 * @property {number} tier - The tier of the achievement
 * @property {number} exp - The exp of the achievement
 * @property {boolean} hidden - The hidden status of the achievement
 * @property {number[]} requires - The list of required achievements to unlock this achievement
 * @property {boolean} repeatable - The repeatable status of the achievement
 * @property {boolean} achieved - The achieved status of the achievement
 * @property {Date} achievedAt - The date at which the achievement was achieved
 *
 * @method fromStackingTemplateToDB - Creates a list of achievements from a stacking template
 * @method toDB - Inserts a list of achievements into the database
 * @method updateAchieved - Updates the achieved status of the achievement
 * @method updateAchievedFromId - Updates the achieved status of an achievement by ID
 * @method getAchievements - Retrieves achievements based on a list of criterias
 */
class Achievement {
  // ==================== CLASS VARIABLES ====================
  public static readonly ACHIEVEMENT_INSERT_QUERY = `INSERT INTO achievements
    (title, icon, category, "group", description, tier, exp, hidden, repeatable, achieved, achievedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(title) DO UPDATE SET
      icon = excluded.icon,
      category = excluded.category,
      "group" = excluded."group",
      description = excluded.description,
      tier = excluded.tier,
      exp = excluded.exp,
      hidden = excluded.hidden,
      repeatable = excluded.repeatable
      `;

  public static readonly FULL_INSERT_QUERY = `
    -- Insert the achievement
    WITH inserted_achievement AS (
      ${Achievement.ACHIEVEMENT_INSERT_QUERY}
      RETURNING id
    ),

    -- Insert the labels
    labels_inserted AS (
      INSERT INTO achievement_labels (achievement_id, label)
      SELECT inserted_achievement.id, ?
      ON CONFLICT(achievement_id, label) DO NOTHING
    ),

    -- Insert the requirements
    requirements_inserted AS (
      INSERT INTO achievement_requirements (achievement_id, requirement_id)
      SELECT inserted_achievement.id, r.requirement_id
      FROM inserted_achievement
      CROSS JOIN (VALUES ?) AS r(requirement_id)
      ON CONFLICT(achievement_id, requirement_id) DO NOTHING
    ),

    -- Insert the criterias
    criteria_inserted AS (
      INSERT INTO achievement_criterias (achievement_id, progression_id, required_value, "type")
      SELECT
        inserted_achievement.id,
        p.id,
        c.required_value,
        c."type"
      FROM inserted_achievement
      JOIN (VALUES ?) AS c(progression_name, required_value, "type")
      JOIN progressions p ON p.name = c.progression_name
      ON CONFLICT(achievement_id, progression_id) DO UPDATE SET
        required_value = excluded.required_value,
        "type" = excluded."type"
    )
    SELECT * FROM inserted_achievement
    `;

  // ==================== PROPERTIES ====================
  public id?: number;
  public title: string;
  public icon: string;
  public category: string;
  public group: string;
  public labels: string[];
  public criteria: { [key: string]: any };
  public description: string;
  public tier: number;
  public exp: number;
  public hidden: boolean;
  public requires: number[];
  public repeatable: boolean;
  public achieved: boolean = false;
  public achievedAt: Date | undefined;

  /**
   * Creates an instance of Achievement.
   *
   * @param {AchievementDict} data - The data to create the achievement from
   * @memberof Achievement
   * @constructor
   * @throws {Error} - If the data is invalid
   * @returns {Achievement} - The created achievement
   */
  constructor(data: AchievementDict) {
    // Destructuring data object for validation and assignment
    let {
      id,
      title,
      icon,
      category,
      group,
      labels,
      criteria,
      description,
      tier,
      exp,
      hidden,
      requires,
      repeatable
    } = data;

    // Input validation
    title = title.trim();
    if (!title) { throw new Error('title must not be empty'); }
    icon = icon.trim();
    if (!icon) { throw new Error('icon must not be empty'); }
    category = category.trim();
    if (!category) { throw new Error('category must not be empty'); }
    group = group.trim();
    if (!group) { throw new Error('group must not be empty'); }
    if (!criteria) { throw new Error('criteria must not be empty'); }
    description = description.trim();
    if (!description) { throw new Error('description must not be empty'); }
    if (tier < 0) { throw new Error('tier must be a positive integer'); }
    if (exp < 0) { throw new Error('exp must be a positive integer'); }
    requires.forEach((requirement) => {
      if (requirement < 0) {
        throw new Error('requirement must be an existing achievement id');
      }
    });
    labels.forEach((label) => {
      if (!label) { throw new Error('label must not be empty'); }
    });

    // Assigning properties
    this.title = title;
    this.icon = icon;
    this.category = category;
    this.group = group;
    this.labels = labels;
    this.criteria = criteria;
    this.description = description;
    this.tier = tier;
    this.exp = exp;
    this.hidden = hidden;
    this.requires = requires;
    this.repeatable = repeatable;
    if (id) {
      this.id = id;
      this.achieved = data.achieved || false;
      this.achievedAt = data.achievedAt;
    }
  }

  // ==================== FROM methods ====================

  /**
   * Creates a list of achievements from a stacking template
   *
   * @static
   * @memberof Achievement
   * @method fromStackingTemplateToDB
   *
   * @param {StackingAchievementTemplate} template - The template to create the achievements from
   * @returns
   */
  static fromStackingTemplateToDB(template: StackingAchievementTemplate, multiplier: number = 1): void {
    const {
      title,
      icon,
      category,
      group,
      labels,
      criterias,
      criteriasFunctions,
      description,
      minTier,
      maxTier,
      expFunction,
      hidden,
      requires,
    } = template;

    const achievementData: any[] = [];
    const criteriaData: any[] = [];
    const requirementData: any[] = [];
    const requirementByIdData: any[] = [];
    const labelsData: any[] = [];
    const tierTitles: string[] = [];

    // Prepare achievement data
    for (let tier = minTier; tier <= maxTier; tier++) {
      const currentTitle = title.replace('%d', (tier - minTier + 1).toString());

      // Calculate criteria values and update description
      const criteriaMap: { [key: string]: any } = {};
      let currentDescription = description;
      for (let i = 0; i < criterias.length; i++) {
        const value = criteriasFunctions[i](tier);
        criteriaMap[criterias[i]] = value * multiplier;
        currentDescription = currentDescription.replace(criterias[i], String(value));
      }

      const currentPoints = expFunction(tier);
      tierTitles.push(currentTitle); // Store titles for linking requirements later

      // Prepare the data for achievements insert
      achievementData.push([
        currentTitle,
        icon,
        category,
        group,
        currentDescription,
        tier,
        currentPoints,
        hidden ? 1 : 0,
        0, // Repeatable: false
        0, // Achieved: false
        null, // AchievedAt: null
      ]);

      // Prepare criteria data for this achievement
      Object.entries(criteriaMap).forEach(([progressionName, value]) => {
        criteriaData.push([value, typeof value, progressionName, currentTitle]);
      });
    }

    // Insert achievements into the database
    const db = db_model.openDB();
    db.transaction(() => {
      const achievementStmt = db.prepare(Achievement.ACHIEVEMENT_INSERT_QUERY);
      achievementData.forEach((params) => {
        achievementStmt.run(params);
      });
    })();

    // Prepare requirements based on tier titles and insert labels
    for (let i = 0; i < tierTitles.length; i++) {
      // Include template requirements
      requires.forEach((requirementId) => {
        requirementByIdData.push([requirementId, tierTitles[i]]);
      });

      labels.forEach((label) => {
        labelsData.push([label, tierTitles[i]]);
      });

      if (i > 0) {
        // Include previous tier as requirement
        requirementData.push([tierTitles[i - 1], tierTitles[i]]);
      }

    }

    // Insert requirements and criteria into the database
    db.transaction(() => {
      // Insert labels
      const labelsStmt = db.prepare(`
        INSERT INTO achievement_labels (achievement_id, label)
        SELECT a.id, ?
        FROM achievements a
        WHERE a.title = ?
        ON CONFLICT(achievement_id, label) DO NOTHING`);
      labelsData.forEach((params) => labelsStmt.run(params));

      // Insert requirements  by titles
      const requirementStmt = db.prepare(`
        INSERT INTO achievement_requirements (achievement_id, requirement_id)
        SELECT a.id, r.id
        FROM achievements a
        JOIN achievements r ON r.title = ?
        WHERE a.title = ?
        ON CONFLICT(achievement_id, requirement_id) DO NOTHING`);
      requirementData.forEach((params) => requirementStmt.run(params));

      // Insert requirements by IDs
      const requirementByIdStmt = db.prepare(`
        INSERT INTO achievement_requirements (achievement_id, requirement_id)
        SELECT a.id, ?
        FROM achievements a
        WHERE a.title = ?
        ON CONFLICT(achievement_id, requirement_id) DO NOTHING`);
      requirementByIdData.forEach((params) => requirementByIdStmt.run(params));

      // Insert criteria
      const criteriaStmt = db.prepare(`
        INSERT INTO achievement_criterias (achievement_id, progression_id, required_value, "type",comparison_operator)
        SELECT a.id, p.id, ?, ?, '>='
        FROM achievements a
        JOIN progressions p ON p.name = ?
        WHERE a.title = ?
        ON CONFLICT(achievement_id, progression_id) DO UPDATE SET
          required_value = excluded.required_value,
          "type" = excluded."type",
          comparison_operator = excluded.comparison_operator`);

      criteriaData.forEach((params) => criteriaStmt.run(params));
    })();
  }


  /**
   * Creates an achievement from a row
   *
   * @static
   * @memberof Achievement
   * @method fromRow
   *
   * @param {AchievementRow} row - The row to create the achievement from
   * @returns {Achievement} - The created achievement
   */
  static fromRow(row: AchievementRow): Achievement {
    return new Achievement({
      id: row.id,
      title: row.title,
      icon: row.icon,
      category: row.category,
      group: row.group,
      labels: row.labels,
      criteria: row.criteria.reduce((acc: any, c: any) => {
        acc[c.progression_name] = parseValue(c.required_value, c.type);
        return acc;
      }, {}),
      description: row.description,
      tier: row.tier,
      exp: row.exp,
      hidden: Boolean(row.hidden),
      requires: row.requirements, // Directly use the array of IDs
      repeatable: Boolean(row.repeatable),
      achieved: Boolean(row.achieved),
      achievedAt: row.achievedAt ? new Date(row.achievedAt) : undefined,
    });
  }

  // ==================== UPDATE ====================

  /**
   * Updates the achieved status of the achievement
   *
   * @memberof Achievement
   * @method updateAchieved
   *
   * @param {boolean} achieved - The achieved status of the achievement
   * @returns {void}
   */
  updateAchieved(achieved: boolean = true): void {
    this.achieved = achieved;
    this.achievedAt = achieved ? new Date() : undefined;
    const query = `UPDATE achievements SET achieved = ?, achievedAt = ? WHERE id = ?`;

    const db = db_model.openDB();
    const statement = db.prepare(query);
    statement.run(achieved ? 1 : 0, achieved ? new Date().toISOString() : null, this.id);
  }


  /**
   * Updates the achieved status of an achievement by ID
   *
   * @static
   * @memberof Achievement
   * @method updateAchievedFromId
   *
   * @param {number} id - The ID of the achievement to update
   * @param {boolean} achieved - The achieved status of the achievement
   * @returns {void}
   */
  static updateAchievedFromId(id: number, achieved: boolean = true): void {
    const query = `UPDATE achievements SET achieved = ?, achievedAt = ? WHERE id = ?`;

    const db = db_model.openDB();
    const statement = db.prepare(query);
    statement.run(achieved ? 1 : 0, achieved ? new Date().toISOString() : null, id);
  }

  // ==================== GET ====================

  /**
   * Retrieves achievements based off (optional) filters
   *
   * @static
   * @memberof Achievement
   * @method getAchievementsRawFormat
   *
   * @param {string[]} criterias - The list of criterias to filter by
   * @returns {Achievement[]} - The list of achievements
   */
  static getAchievementsRawFormat(filters: AchievementSelectRequestFilters): { count: number | null, achievements: AchievementRow[] } {
    const db = db_model.openDB();

    // Base query for achievements
    let baseQuery = `
      FROM achievements a
      LEFT JOIN achievement_requirements ar ON a.id = ar.achievement_id
      LEFT JOIN achievements r ON ar.requirement_id = r.id
      LEFT JOIN achievement_criterias c ON a.id = c.achievement_id
      LEFT JOIN progressions p ON c.progression_id = p.id
      LEFT JOIN achievement_labels al ON a.id = al.achievement_id
    `;

    const conditions: string[] = [];
    const values: any[] = [];

    // Apply filters
    if (filters.category) {
      conditions.push('a.category = ?');
      values.push(filters.category);
    }
    if (filters.group) {
      conditions.push('a."group" = ?');
      values.push(filters.group);
    }
    if (filters.labels && filters.labels.length > 0) {
      // Match achievements with all provided labels
      const labelConditions = filters.labels.map(() => 'EXISTS (SELECT 1 FROM achievement_labels al WHERE al.achievement_id = a.id AND al.label = ?)');
      conditions.push(`(${labelConditions.join(' AND ')})`);
      values.push(...filters.labels);
    }
    if (filters.title) {
      conditions.push('a.title LIKE ?');
      values.push(`%${filters.title}%`);
    }
    if (filters.achieved !== undefined) {
      conditions.push('a.achieved = ?');
      values.push(filters.achieved ? 1 : 0);
    }
    if (filters.hidden !== undefined) {
      conditions.push('a.hidden = ?');
      values.push(filters.hidden ? 1 : 0);
    }
    if (filters.achievable !== undefined) {
      if (filters.achievable) {
        conditions.push(`a.id NOT IN (
          SELECT achievement_id FROM achievement_requirements WHERE requirement_id NOT IN (
            SELECT id FROM achievements WHERE achieved = 1
          )
        )`);
      } else {
        conditions.push(`a.id IN (
          SELECT achievement_id FROM achievement_requirements WHERE requirement_id IN (
            SELECT id FROM achievements WHERE achieved = 1
          )
        )`);
      }
    }

    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = ` WHERE ${conditions.join(' AND ')}`;
    }

    let count: number | null = null;

    // If count is requested, calculate the total count
    if (filters.count) {
      const countQuery = `SELECT COUNT(DISTINCT a.id) AS total
        ${baseQuery}
        ${whereClause}
      `;
      const countRow = db.prepare(countQuery).get(values) as { total: number };
      count = countRow.total;
    }

    // Query to get the achievements
    let achievementsQuery = `
      SELECT
        a.*,
        COALESCE(json_group_array(DISTINCT al.label), '[]') AS labels,
        COALESCE(json_group_array(r.id), '[]') AS requirements,
        COALESCE(
          json_group_array(
            json_object(
              'progression_name', p.name,
              'required_value', c.required_value,
              'type', c.type
            )
          ),
          '[]'
        ) AS criteria
      ${baseQuery}
      ${whereClause}
      GROUP BY a.id
    `;

    if (filters.sortCriteria) {
      achievementsQuery += ` ORDER BY a.${filters.sortCriteria}`;
      if (filters.sortDirection) {
        achievementsQuery += ` ${filters.sortDirection.toUpperCase()}`;
      }
    }

    if (filters.limit) {
      achievementsQuery += ' LIMIT ?';
      values.push(filters.limit);
    }
    if (filters.offset) {
      achievementsQuery += ' OFFSET ?';
      values.push(filters.offset);
    }

    const rows = db.prepare(achievementsQuery).all(values) as RawAchievementRow[];

    // Parse JSON fields
    const achievements = rows.map((row) => ({
      ...row,
      requirements: JSON.parse(row.requirements),
      criteria: JSON.parse(row.criteria),
      labels: JSON.parse(row.labels),
    }));

    return { count, achievements };
  }

  /**
   * Retrieves achievements based on a list of criterias
   *
   * @static
   * @memberof Achievement
   * @method getAchievements
   *
   * @param {AchievementSelectRequestFilters} filters - The filters to apply
   * @returns {Achievement[]} - The list of achievements
   */
  static getAchievements(filters: AchievementSelectRequestFilters): { count: number | null, achievements: Achievement[] } {
    const { count, achievements } = Achievement.getAchievementsRawFormat(filters);
    return {
      count,
      achievements: achievements.map(Achievement.fromRow),
    };
  }


  /**
 * Retrieves the total number of achievements and the total number of achieved achievements.
 *
 * @static
 * @memberof Achievement
 * @method getAchievementStats
 *
 * @returns {{ totalAchievements: number, achievedCount: number }} - The total achievements and achieved achievements.
 */
  static getAchievementStats(): { totalAchievements: number, achievedCount: number } {
    const db = db_model.openDB();

    // Query to count total achievements and total achieved achievements
    const query = `
    SELECT
      (SELECT COUNT(*) FROM achievements) AS totalAchievements,
      (SELECT COUNT(*) FROM achievements WHERE achieved = 1) AS achievedCount
  `;

    return db.prepare(query).get() as { totalAchievements: number, achievedCount: number };
  }

  // ==================== DATABASE ====================
  /**
   * Retrieves the available groups from the database
   *
   * @static
   * @memberof Achievement
   * @method getGroups
   *
   * @returns {string[]} - The list of groups
   */
  static getGroups(): string[] {
    const db = db_model.openDB();
    const rows = db.prepare('SELECT DISTINCT "group" FROM achievements').all();
    return rows.map((row) => (row as any).group);
  }

  /**
   * Retrieves the available categories from the database
   *
   * @static
   * @memberof Achievement
   * @method getCategories
   *
   * @returns {string[]} - The list of categories
   */
  static getCategories(): string[] {
    const db = db_model.openDB();
    const rows = db.prepare('SELECT DISTINCT category FROM achievements').all();
    return rows.map((row) => (row as any).category);
  }

  /**
   * Retrieves the available labels from the database
   *
   * @static
   * @memberof Achievement
   * @method getLabels
   *
   * @returns {string[]} - The list of labels
   */
  static getLabels(): string[] {
    const db = db_model.openDB();
    const rows = db.prepare('SELECT DISTINCT label FROM achievement_labels').all();
    return rows.map((row) => (row as any).label);
  }

}

export default Achievement;
