/**
 * Achievement class definition and methods
 *
 * Contains JSON output method
 * Contains builder method to create achievements from a template
 * @module Achievement
 * @author BoxBoxJason
 * @date 2024-11-11
 */

import * as path from 'path';
import { db_model } from '../model';
import { parseValue } from '../../../utils/types';

interface StackingAchievementTemplate {
  title: string;
  iconDir: string;
  category: string;
  group: string;
  labels: string[];
  criterias: string[];
  criteriasFunctions: ((tier: number) => any)[];
  description: string;
  minTier: number;
  maxTier: number;
  pointsFunction: (tier: number) => number;
  hidden: boolean;
  requires: number[];
}

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
  points: number;
  hidden: boolean;
  requires: number[];
  repeatable: boolean;
  achieved?: boolean;
  achievedAt?: Date;
}

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
}

interface RawAchievementRow {
  id: number;
  title: string;
  icon: string;
  category: string;
  group: string;
  labels: string;
  description: string;
  tier: number;
  points: number;
  hidden: boolean;
  achieved: boolean;
  achievedAt: string | null;
  repeatable: boolean;
  requirements: string;
  criteria: string;
}

interface AchievementRow {
  id: number;
  title: string;
  icon: string;
  category: string;
  group: string;
  labels: string;
  description: string;
  tier: number;
  points: number;
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
 * @property {number} points - The points of the achievement
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

  public static readonly ACHIEVEMENT_INSERT_QUERY = `INSERT INTO achievements
    (title, icon, category, "group", labels, description, tier, points, hidden, repeatable, achieved, achievedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(title) DO UPDATE SET
      icon = excluded.icon,
      category = excluded.category,
      "group" = excluded."group",
      labels = excluded.labels,
      description = excluded.description,
      tier = excluded.tier,
      points = excluded.points,
      hidden = excluded.hidden,
      repeatable = excluded.repeatable
      `;

  public static readonly FULL_INSERT_QUERY = `
    -- Insert the achievement
    WITH inserted_achievement AS (
      ${Achievement.ACHIEVEMENT_INSERT_QUERY}
      RETURNING id
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
  private static ICONS_DIR = path.join('icons', 'achievements');

  public id?: number;
  public title: string;
  public icon: string;
  public category: string;
  public group: string;
  public labels: string[];
  public criteria: { [key: string]: any };
  public description: string;
  public tier: number;
  public points: number;
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
      points,
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
    if (points < 0) { throw new Error('points must be a positive integer'); }
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
    this.icon = path.join(Achievement.ICONS_DIR, icon);
    this.category = category;
    this.group = group;
    this.labels = labels;
    this.criteria = criteria;
    this.description = description;
    this.tier = tier;
    this.points = points;
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
  static fromStackingTemplateToDB(template: StackingAchievementTemplate): void {
    const {
        title,
        iconDir,
        category,
        group,
        labels,
        criterias,
        criteriasFunctions,
        description,
        minTier,
        maxTier,
        pointsFunction,
        hidden,
        requires,
    } = template;

    const achievementData : any[] = [];
    const criteriaData : any[] = [];
    const requirementData : any[] = [];
    const tierTitles: string[] = [];

    // Prepare achievement data
    for (let tier = minTier; tier <= maxTier; tier++) {
        const currentTitle = title.replace('%d', (tier - minTier + 1).toString());
        const currentIcon = path.join(iconDir, String(tier));

        // Calculate criteria values and update description
        const criteriaMap: { [key: string]: any } = {};
        let currentDescription = description;
        for (let i = 0; i < criterias.length; i++) {
            const value = criteriasFunctions[i](tier);
            criteriaMap[criterias[i]] = value;
            currentDescription = currentDescription.replace(criterias[i], String(value));
        }

        const currentPoints = pointsFunction(tier);
        tierTitles.push(currentTitle); // Store titles for linking requirements later

        // Prepare the data for achievements insert
        achievementData.push([
            currentTitle,
            currentIcon,
            category,
            group,
            JSON.stringify(labels),
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
          criteriaData.push([progressionName, value, typeof value, currentTitle]);
        });
    }

    // Insert achievements into the database
    const db = db_model.openDB();
    const insertedAchievementIds: number[] = [];
    db.transaction(() => {
        const achievementStmt = db.prepare(Achievement.ACHIEVEMENT_INSERT_QUERY);
        achievementData.forEach((params) => {
            const result = achievementStmt.run(params);
            const lastInsertRowId = Number(result.lastInsertRowid);
            if (lastInsertRowId > 0) {
              insertedAchievementIds.push(lastInsertRowId); // Collect inserted IDs
            }
        });
    })();

    // Prepare requirements based on inserted IDs
    for (let i = 0; i < insertedAchievementIds.length; i++) {
        const currentId = insertedAchievementIds[i];
        const previousId = i > 0 ? insertedAchievementIds[i - 1] : null;

        // Include template requirements and previous tier ID
        const currentRequires = [...requires];
        if (previousId !== null) {
            currentRequires.push(previousId); // Link to the previous tier
        }

        currentRequires.forEach((requirementId) => {
            requirementData.push([currentId, requirementId]);
        });
    }

    // Insert requirements and criteria into the database
    db.transaction(() => {
        // Insert requirements
        const requirementStmt = db.prepare(`
            INSERT INTO achievement_requirements (achievement_id, requirement_id)
            VALUES (?, ?)
            ON CONFLICT(achievement_id, requirement_id) DO NOTHING
        `);
        requirementData.forEach((params) => requirementStmt.run(params));

        // Insert criteria
        const criteriaStmt = db.prepare(`
            INSERT INTO achievement_criterias (achievement_id, progression_id, required_value, "type")
            SELECT a.id, p.id, ?, ?
            FROM achievements a
            JOIN progressions p ON p.name = ?
            WHERE a.title = ?
            ON CONFLICT(achievement_id, progression_id) DO UPDATE SET
              required_value = excluded.required_value,
              "type" = excluded."type"
        `);
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
      labels: JSON.parse(row.labels),
      criteria: row.criteria.reduce((acc: any, c: any) => {
        acc[c.progression_name] = parseValue(c.required_value, c.type);
        return acc;
      }, {}),
      description: row.description,
      tier: row.tier,
      points: row.points,
      hidden: Boolean(row.hidden),
      requires: row.requirements, // Directly use the array of IDs
      repeatable: Boolean(row.repeatable),
      achieved: Boolean(row.achieved),
      achievedAt: row.achievedAt ? new Date(row.achievedAt) : undefined,
    });
  }
  // ==================== TO methods ====================

  /**
   * Inserts a list of achievements into the database
   *
   * @static
   * @memberof Achievement
   * @method toDB
   *
   * @param {Achievement[]} achievements - The list of achievements to insert
   * @returns {void}
   */
  static toDB(achievements: Achievement[]): void {
    const db = db_model.openDB();

    // Prepare batched SQL queries for achievements, requirements, and criteria
    const achievementInserts: any[] = [];
    const requirementInserts: any[] = [];
    const criteriaInserts: any[] = [];

    achievements.forEach((achievement) => {
      // Prepare achievement parameters
      const achievementParams = [
        achievement.title,
        achievement.icon,
        achievement.category,
        achievement.group,
        JSON.stringify(achievement.labels),
        achievement.description,
        achievement.tier,
        achievement.points,
        achievement.hidden ? 1 : 0,
        achievement.repeatable ? 1 : 0,
        achievement.achieved ? 1 : 0,
        achievement.achievedAt ? achievement.achievedAt.toISOString() : null,
      ];
      achievementInserts.push(achievementParams);

      // Prepare requirements
      achievement.requires.forEach((requirementId) => {
        requirementInserts.push([requirementId, achievement.title]);
      });

      // Prepare criteria
      Object.entries(achievement.criteria).forEach(([progressionName, value]) => {
        let type: string;
        if (typeof value === 'number') {
          type = 'integer';
        } else if (typeof value === 'boolean') {
          type = 'boolean';
        } else if (value instanceof Date) {
          type = 'datetime';
          value = value.toISOString();
        } else {
          type = 'text';
        }
        criteriaInserts.push([progressionName, value, type, achievement.title]);
      });
    });

    // Execute batched inserts in a single transaction
    // WARNING: IF DB EVER CHANGES TO ASYNCHRONOUS, THIS WILL NEED TO BE REFACTORED
    db.transaction(() => {
      // Bulk insert achievements
      const achievementStmt = db.prepare(Achievement.ACHIEVEMENT_INSERT_QUERY);
      achievementInserts.forEach((params) => achievementStmt.run(params));

      // Bulk insert requirements
      const requirementStmt = db.prepare(`
        INSERT INTO achievement_requirements (achievement_id, requirement_id)
        SELECT a.id, ?
        FROM achievements a WHERE a.title = ?
        ON CONFLICT(achievement_id, requirement_id) DO NOTHING
      `);
      requirementInserts.forEach((params) => requirementStmt.run(params));

      // Bulk insert criteria
      const criteriaStmt = db.prepare(`
        INSERT INTO achievement_criterias (achievement_id, progression_id, required_value, "type")
        SELECT a.id, p.id, ?, ?
        FROM achievements a
        JOIN progressions p ON p.name = ?
        WHERE a.title = ?
        ON CONFLICT(achievement_id, progression_id) DO UPDATE SET
          required_value = excluded.required_value,
          "type" = excluded."type"
      `);
      criteriaInserts.forEach((params) => criteriaStmt.run(params));
    })();
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
  static getAchievementsRawFormat(filters: AchievementSelectRequestFilters): AchievementRow[] {
    const db = db_model.openDB();

    // Base query for achievements
    let query = `
      SELECT
        a.*,
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
      FROM achievements a
      LEFT JOIN achievement_requirements ar ON a.id = ar.achievement_id
      LEFT JOIN achievements r ON ar.requirement_id = r.id
      LEFT JOIN achievement_criterias c ON a.id = c.achievement_id
      LEFT JOIN progressions p ON c.progression_id = p.id
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
      filters.labels.forEach((label) => {
        conditions.push('a.labels LIKE ?');
        values.push(`%${label}%`);
      });
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

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY a.id
    `;

    if (filters.sortCriteria) {
      query += ` ORDER BY a.${filters.sortCriteria}`;
      if (filters.sortDirection) {
        query += ` ${filters.sortDirection.toUpperCase()}`;
      }
    }

    if (filters.limit) {
      query += ' LIMIT ?';
      values.push(filters.limit);
    }
    if (filters.offset) {
      query += ' OFFSET ?';
      values.push(filters.offset);
    }

    // Execute query
    const rows = db.prepare(query).all(values) as RawAchievementRow[];

    // Parse JSON fields
    return rows.map((row) => ({
      ...row,
      requirements: JSON.parse(row.requirements),
      criteria: JSON.parse(row.criteria),
    }));
  }


  static getAchievements(filters : AchievementSelectRequestFilters) : Achievement[] {
    const rows = Achievement.getAchievementsRawFormat(filters);
    return rows.map((row) => Achievement.fromRow(row));
  }

}

export default Achievement;
export { StackingAchievementTemplate };
