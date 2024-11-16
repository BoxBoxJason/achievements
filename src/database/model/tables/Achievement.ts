/**
 * Achievement class definition and methods
 *
 * Contains JSON output method
 * Contains builder method to create achievements from a template
 * @module Achievement
 * @author BoxBoxJason
 * @date 2024-11-11
 */

import * as fs from 'fs';
import * as path from 'path';
import { db_model } from '../model';
import AchievementRequirement from './AchievementRequirement';

interface StackingAchievementTemplate {
  name: string;
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

interface AchievementDict {
  id?: number;
  name: string;
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

/**
 * Achievement class, contains the information of an achievement and its processing methods
 *
 * @class Achievement
 *
 * @property {number} id - The unique identifier of the achievement
 * @property {string} name - The name of the achievement
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
 * @method fromObject - Creates an achievement from an object
 * @method fromRow - Creates an achievement from a database row
 * @method fromDB - Retrieves all achievements from the database
 * @method fromJsonFile - Creates a list of achievements from a JSON file
 * @method toObject - Converts the achievement to an object
 * @method toRow - Inserts the achievement into the database
 * @method toDB - Inserts a list of achievements into the database
 * @method toJsonFile - Writes a list of achievements to a JSON file
 * @method updateAchieved - Updates the achieved status of the achievement
 * @method updateAchievedFromId - Updates the achieved status of an achievement by ID
 * @method getAchievementsByCriterias - Retrieves achievements based on a list of criterias
 */
class Achievement {
  private static ICONS_DIR = path.join('icons', 'achievements');

  public id?: number;
  public name: string;
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
      name,
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
    name = name.trim();
    if (!name) { throw new Error('name must not be empty'); }
    icon = icon.trim();
    if (!icon) { throw new Error('icon must not be empty'); }
    category = category.trim();
    if (!category) { throw new Error('category must not be empty'); }
    group = group.trim();
    if (!group) { throw new Error('group must not be empty'); }
    if (!criteria) { throw new Error('criteria must not be empty'); }
    description = description.trim();
    if (!description) { throw new Error('description must not be empty'); }
    if (tier < 0) { throw new Error('tier must be a positiidCounterve integer'); }
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
    this.name = name;
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
   * @returns {Achievement[]}
   */
  static fromStackingTemplateToDB(
    template: StackingAchievementTemplate
  ): Achievement[] {
    const {
      name,
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

    const achievements: Achievement[] = [];

    for (let tier = minTier; tier <= maxTier; tier++) {
      // Adding the last achievement id to the requires list
      let currentRequire: number[] = [...requires];
      if (achievements.length > 0) {
        let lastAchievement = achievements[achievements.length - 1];
        if (lastAchievement.id !== undefined) {
          currentRequire.push(lastAchievement.id); // Add the previous achievement's ID
        }
      }

      // Replacing the criterias in the description with the actual values
      const criteriaMap: { [key: string]: any } = {};
      let currentDescription = description;
      for (let i = 0; i < criterias.length; i++) {
        criteriaMap[criterias[i]] = criteriasFunctions[i](tier);
        currentDescription = currentDescription.replace(
          criterias[i],
          String(criteriaMap[criterias[i]])
        );
      }

      // Setting the points for the achievement
      const points = pointsFunction(tier);

      // Creating the achievement
      let achievement = new Achievement({
        name: name.replace('%d', (tier - minTier + 1).toString()),
        icon: path.join(iconDir, String(tier)),
        category: category,
        group: group,
        labels: labels,
        criteria: criteriaMap,
        description: currentDescription,
        tier: tier,
        points: points,
        hidden: hidden,
        requires: currentRequire,
        repeatable: false,
      });

      // Wait for the achievement to be inserted and its ID to be set
      achievement.toRow();
      achievements.push(achievement);
    }

    return achievements;
  }

  /**
   * Creates an achievement from an object
   *
   * @static
   * @memberof Achievement
   * @method fromObject
   *
   * @param {AchievementDict} data - The data to create the achievement from
   * @returns {Achievement} - The created achievement
   */
  static fromObject(data: { [key: string]: any }): Achievement {
    return new Achievement({
      id: data.id,
      name: data.name,
      icon: data.icon,
      category: data.category,
      group: data.group,
      labels: data.labels,
      criteria: data.criteria,
      description: data.description,
      tier: data.tier,
      points: data.points,
      hidden: data.hidden,
      requires: data.requires,
      repeatable: data.repeatable,
      achieved: data.achieved,
      achievedAt: data.achievedAt
    });
  }

  /**
   * Creates an achievement from a database row
   *
   * @static
   * @memberof Achievement
   * @method fromRow
   *
   * @param {any} row - The database row to create the achievement from
   * @returns {Achievement} - The created achievement
   */
  static fromRow(row: any): Achievement {
    const db = db_model.openDB();
    const query = `SELECT requirement_id FROM achievement_requirements WHERE achievement_id = ?`;
    const requirementRows = db.prepare(query).all(row.id) as { requirement_id: number }[];
    const requires = requirementRows.map((r) => r.requirement_id);

    return new Achievement({
      id: row.id,
      name: row.name,
      icon: row.icon,
      category: row.category,
      group: row.group,
      labels: JSON.parse(row.labels),
      criteria: JSON.parse(row.criteria),
      description: row.description,
      tier: row.tier,
      points: row.points,
      hidden: Boolean(row.hidden),
      requires: requires,
      repeatable: Boolean(row.repeatable),
      achieved: Boolean(row.achieved),
      achievedAt: row.achievedAt ? new Date(row.achievedAt) : undefined
    });
  }


  /**
   * Retrieves all achievements from the database
   *
   * @static
   * @memberof Achievement
   * @method fromDB
   *
   * @returns {Achievement[]} - The list of achievements
   */
  static fromDB(): Achievement[] {
    const db = db_model.openDB();
    const query = 'SELECT * FROM achievements';
    const rows = db.prepare(query).all();
    return rows.map(row => Achievement.fromRow(row));
  }


  /**
   * Creates a list of achievements from a JSON file
   *
   * @static
   * @memberof Achievement
   * @method fromJsonFile
   *
   * @param {string} filePath - The path to the JSON file
   * @returns {Achievement[]} - The list of created achievements
   */
  static fromJsonFile(filePath: string): Achievement[] {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { [key: string]: any }[];
    return data.map((achievementData) => Achievement.fromObject(achievementData));
  }

  // ==================== TO methods ====================

  /**
   * Converts the achievement to an object
   *
   * @memberof Achievement
   * @method toObject
   *
   * @returns {AchievementDict} - The achievement as an object
   */
  toObject(): AchievementDict {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      category: this.category,
      group: this.group,
      labels: this.labels,
      criteria: this.criteria,
      description: this.description,
      tier: this.tier,
      points: this.points,
      hidden: this.hidden,
      requires: this.requires,
      repeatable: this.repeatable,
      achieved: this.achieved,
      achievedAt: this.achievedAt
    };
  }


  /**
   * Inserts the achievement into the database
   *
   * @memberof Achievement
   * @method toRow
   *
   * @returns {void}
   */
  toRow(): void {
    const query = `INSERT INTO achievements
    (name, icon, category, "group", labels, criteria, description, tier, points, hidden, repeatable, achieved, achievedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      icon = excluded.icon,
      category = excluded.category,
      "group" = excluded."group",
      labels = excluded.labels,
      criteria = excluded.criteria,
      description = excluded.description,
      tier = excluded.tier,
      points = excluded.points,
      hidden = excluded.hidden,
      repeatable = excluded.repeatable
      `;

    const db = db_model.openDB();
    const statement = db.prepare(query);
    const info = statement.run(
      this.name,
      this.icon,
      this.category,
      this.group,
      JSON.stringify(this.labels),
      JSON.stringify(this.criteria),
      this.description,
      this.tier,
      this.points,
      this.hidden ? 1 : 0,
      this.repeatable ? 1 : 0,
      this.achieved ? 1 : 0,
      this.achievedAt ? this.achievedAt.toISOString() : null
    );

    this.id = info.lastInsertRowid as number;

    // Handle any additional insertion logic (requirements)
    const requirementInsertQuery = `
      INSERT INTO achievement_requirements (achievement_id, requirement_id)
      SELECT ?, ?
      WHERE EXISTS (SELECT 1 FROM achievements WHERE id = ?)
        AND EXISTS (SELECT 1 FROM achievements WHERE id = ?)
      ON CONFLICT(achievement_id, requirement_id) DO NOTHING
    `;
    const insertStatement = db.prepare(requirementInsertQuery);
    this.requires.forEach(requirementId => {
      insertStatement.run(this.id, requirementId, this.id, requirementId);
    });
  }


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
    const query = `INSERT INTO achievements
      (name, icon, category, "group", labels, criteria, description, tier, points, hidden, repeatable, achieved, achievedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    ON CONFLICT(name) DO UPDATE SET
      icon = excluded.icon,
      category = excluded.category,
      "group" = excluded."group",
      labels = excluded.labels,
      criteria = excluded.criteria,
      description = excluded.description,
      tier = excluded.tier,
      points = excluded.points,
      hidden = excluded.hidden,
      repeatable = excluded.repeatable
      `;

    const statement = db.prepare(query);
    db.transaction(() => {
      achievements.forEach((achievement) => {
        const info = statement.run(
          achievement.name,
          achievement.icon,
          achievement.category,
          achievement.group,
          JSON.stringify(achievement.labels),
          JSON.stringify(achievement.criteria),
          achievement.description,
          achievement.tier,
          achievement.points,
          achievement.hidden ? 1 : 0,
          achievement.repeatable ? 1 : 0,
          achievement.achieved ? 1 : 0,
          achievement.achievedAt ? achievement.achievedAt.toISOString() : null
        );

        achievement.id = info.lastInsertRowid as number;

        // Handle any additional insertion logic (e.g., requirements)
        const requirementInsertQuery = `
          INSERT INTO achievement_requirements (achievement_id, requirement_id)
          SELECT ?, ?
          WHERE EXISTS (SELECT 1 FROM achievements WHERE id = ?)
            AND EXISTS (SELECT 1 FROM achievements WHERE id = ?)
          ON CONFLICT(achievement_id, requirement_id) DO NOTHING
        `;
        const insertStatement = db.prepare(requirementInsertQuery);
        achievement.requires.forEach(requirementId => {
          insertStatement.run(achievement.id, requirementId, achievement.id, requirementId);
        });
      });
    })();
  }


  /**
   * Writes a list of achievements to a JSON file
   *
   * @static
   * @memberof Achievement
   * @method toJsonFile
   *
   * @param {Achievement[]} instances - The list of achievements to write
   * @param {string} filePath - The path to the JSON file
   * @returns {void}
   */
  static toJsonFile(instances: Achievement[], filePath: string): void {
    const data = instances.map((achievement) => achievement.toObject());
    fs.writeFileSync(filePath, JSON.stringify(data, null), 'utf-8');
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
   * Retrieves achievements based on a list of criterias
   *
   * @static
   * @memberof Achievement
   * @method getAchievementsByCriterias
   *
   * @param {string[]} criterias - The list of criterias to search for
   * @returns {Achievement[]} - The list of achievements that match the criterias
   *
   */
  static getAchievementsByCriterias(criterias: string[]): Achievement[] {
    if (criterias.length === 0) {
      return [];
    }

    const likeConditions = criterias.map(() => `criteria LIKE ?`).join(' AND ');

    const query = `SELECT * FROM achievements WHERE ${likeConditions}`;
    const db = db_model.openDB();

    const values = criterias.map(criteria => `%${criteria}%`);
    const rows = db.prepare(query).all(values);
    return rows.map(row => Achievement.fromRow(row));
  }


  /**
 * Retrieves achievable achievements based on a list of criteria.
 *
 * @static
 * @memberof Achievement
 * @method getAchievableByCriterias
 *
 * @param {string[]} criterias - The list of criteria to search for
 * @returns {Achievement[]} - The list of achievable achievements that match the criteria
 */
  static getAchievableByCriterias(criterias: string[]): Achievement[] {
    if (criterias.length === 0) {
      return [];
    }

    const likeConditions = criterias.map(() => `criteria LIKE ?`).join(' AND ');

    // Query to find achievable achievements that meet the criteria and have their requirements met
    const query = `
    SELECT a.*
    FROM achievements a
    LEFT JOIN achievement_requirements ar ON a.id = ar.achievement_id
    LEFT JOIN achievements r ON ar.requirement_id = r.id
    WHERE ${likeConditions}
      AND a.achieved = 0
      AND (
          ar.requirement_id IS NULL OR
          a.id NOT IN (
              SELECT achievement_id
              FROM achievement_requirements ar2
              LEFT JOIN achievements r2 ON ar2.requirement_id = r2.id
              WHERE r2.achieved = 0
          )
      )
  `;

    const db = db_model.openDB();
    const values = criterias.map(criteria => `%${criteria}%`);
    const rows = db.prepare(query).all(values);
    return rows.map(row => Achievement.fromRow(row));
  }

}

export default Achievement;
export { StackingAchievementTemplate };
