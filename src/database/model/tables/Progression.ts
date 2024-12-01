/**
 * Progression database model, represents each achievement criteria value
 *
 * @class Progression
 * @author: BoxBoxJason
 */

import { db_model } from '../model';

// ==================== TYPES ====================

// Progression dictionary, defines the structure of the progression object, always json serializable
interface ProgressionDict {
  id?: number;
  name: string;
  value: string | number | Date | boolean;
  type: string;
}
// Progression row, represents a progression in raw format
interface ProgressionRow {
  id: number;
  name: string;
  value: string;
  type: string;
}
// Progression select request filters, defines the structure of the filters object
export interface ProgressionSelectRequestFilters {
  offset?: number;
  limit?: number;
  name?: string;
  type?: string;
}

/**
 * Represents a progression value for an achievement.
 *
 * @class Progression
 * @property {number} id - The ID of the progression.
 * @property {string} name - The name of the progression.
 * @property {number} value - The value of the progression.
 * @method fromRow - Creates an instance of Progression from a database row.
 * @method fromDB - Retrieves all progressions from the database.
 * @method toRow - Inserts an instance of Progression into the database.
 * @method toDB - Inserts multiple instances of Progression into the database.
 * @method updateValue - Updates the value of the progression.
 * @method addValue - Adds a value to the progression.
 * @default Progression
 */
class Progression {
  public id?: number;
  public name: string;
  public value: string | number | Date | boolean;
  public type: string;

  public static readonly INSERT_QUERY = `INSERT INTO progressions
    (name,value,"type") VALUES (?,?,?)
    ON CONFLICT(name) DO UPDATE SET
      "type" = excluded."type"`;

  constructor(data: ProgressionDict) {
    this.name = data.name;
    this.value = data.value || 0;
    this.type = data.type || 'number';
  }

  // ==================== FROM methods ====================

  /**
   * Creates an instance of Progression from a database row.
   *
   * @memberof Progression
   * @method fromRow
   * @static
   *
   * @param {any} row - The database row to create an instance from.
   * @returns {Progression} - An instance of Progression.
   */
  static fromRow(row: any): Progression {
    return new Progression({
      id: row.id,
      name: row.name,
      value: row.value,
      type: row.type,
    });
  }


  /**
   * Retrieves all progressions from the database.
   *
   * @memberof Progression
   * @method fromDB
   * @static
   *
   * @returns {Progression[]} - An array of all progressions.
   */
  static fromDB(): Progression[] {
    const db = db_model.openDB();
    const query = 'SELECT * FROM progressions';
    const rows = db.prepare(query).all();
    return rows.map((row) => Progression.fromRow(row));
  }

  // ==================== TO methods ====================

  /**
   * Inserts an instance of Progression into the database.
   *
   * @memberof Progression
   * @method toRow
   *
   * @returns {void}
   */
  toRow(): void {
    const db = db_model.openDB();

    const statement = db.prepare(Progression.INSERT_QUERY);
    const info = statement.run([this.name, this.value, this.type]);

    // Change the id of the instance to the id of the row if it was inserted
    if (info.changes && info.lastInsertRowid) {
      this.id = Number(info.lastInsertRowid);
    }
  }

  /**
   * Inserts multiple instances of Progression into the database.
   *
   * @memberof Progression
   * @method toDB
   * @static
   *
   * @param {Progression[]} progressions - An array of Progression instances to insert.
   * @returns {void}
   */
  static toDB(progressions: Progression[]): void {
    const db = db_model.openDB();
    const statement = db.prepare(Progression.INSERT_QUERY);
    db.transaction((progressions) => {
      for (const progression of progressions) {
        statement.run([progression.name, progression.value, progression.type]);
      }
    })(progressions);

  }

  // ==================== UPDATE ====================

  /**
   * Achieves achievements related to specific progressions if their criteria are met.
   * Returns an array of newly achieved achievements.
   *
   * @memberof Progression
   * @method achieveCompletedAchievements
   * @static
   *
   * @param {number[]} progressionIds - The IDs of the progressions to process.
   * @returns {{ id: number; title: string; achievedAt: string }[]} - An array of newly achieved achievements.
   */
  static achieveCompletedAchievements(progressionIds: number[]): { id: number; title: string; achievedAt: string }[] {
    if (progressionIds.length === 0) {
      return []; // No progressions to process
    }

    const updateAchievementsQuery = `
      -- Validate and mark achievements related to specific progressions as completed
      WITH valid_achievements AS (
        SELECT ia.id AS achievement_id
        FROM achievements ia
        JOIN achievement_criterias ac ON ia.id = ac.achievement_id
        JOIN progressions p ON ac.progression_id = p.id
        WHERE p.id IN (${progressionIds.map(() => '?').join(', ')}) -- Only consider updated progressions
          AND ia.achieved = FALSE
          AND
          CASE ac.comparison_operator
            WHEN '=' THEN p.value = ac.required_value
            WHEN '<' THEN CAST(p.value AS REAL) < CAST(ac.required_value AS REAL)
            WHEN '>' THEN CAST(p.value AS REAL) > CAST(ac.required_value AS REAL)
            WHEN '<=' THEN CAST(p.value AS REAL) <= CAST(ac.required_value AS REAL)
            WHEN '>=' THEN CAST(p.value AS REAL) >= CAST(ac.required_value AS REAL)
            ELSE 0
          END
        GROUP BY ia.id
        HAVING COUNT(*) = (
          SELECT COUNT(*)
          FROM achievement_criterias
          WHERE achievement_id = ia.id
        )
      )
      UPDATE achievements
      SET achieved = TRUE, achievedAt = CURRENT_TIMESTAMP
      WHERE id IN (SELECT achievement_id FROM valid_achievements)
      RETURNING id, title, achievedAt;
    `;

    const db = db_model.openDB();

    // Pass the progressionIds as parameters to the query
    return db.prepare(updateAchievementsQuery).all(progressionIds) as { id: number; title: string; achievedAt: string }[];
  }


  /**
   * Adds a value to the progression.
   *
   * @memberof Progression
   * @method increaseValue
   *
   * @param {number} value - The value to add to the progression.
   * @returns {{[key: string]: any}[]} - An array of updated progressions
   */
  static addValue(filters: ProgressionSelectRequestFilters, value: number | string = 1): { id: number }[] {
    const ADD_VALUE_QUERY = `
      UPDATE progressions
      SET value =
        CASE
          WHEN value IS NULL THEN ?
          WHEN "type" = 'number' THEN CAST(value AS INTEGER) + ?
          WHEN "type" = 'integer' THEN CAST(value AS INTEGER) + ?
          WHEN "type" = 'float' THEN CAST(value AS FLOAT) + ?
          WHEN "type" = 'date' THEN DATETIME(value, ?)
          WHEN "type" = 'datetime' THEN DATETIME(value, ?)
          ELSE NULL
        END
      WHERE SELECTOR_PLACEHOLDER
      RETURNING id;
      `;

    const db = db_model.openDB();
    const [selectorColumn, selectorValue] = parseUpdateFilters(filters);

    return db.prepare(ADD_VALUE_QUERY.replace('SELECTOR_PLACEHOLDER', selectorColumn)).all([value, value, value, value, value, value, selectorValue]) as { id: number }[];
  }

  /**
   * Updates the value of progressions that match the given filter
   *
   * @memberof Progression
   * @method updateValue
   * @static
   *
   * @param {ProgressionSelectRequestFilters} filters - The filters to apply to the query.
   * @param {string} value - The new value of the progression.
   * @returns {AchievementRow[]} - An array of newly achieved achievements.
   */
  static updateValue(filters: ProgressionSelectRequestFilters, value: string): { id: number }[] {
    const UPDATE_VALUE_QUERY = `
      UPDATE progressions
      SET value = ?
      WHERE SELECTOR_PLACEHOLDER
      RETURNING id;
      `;
    let [selectorColumn, selectorValue] = parseUpdateFilters(filters);
    let query = UPDATE_VALUE_QUERY.replace('SELECTOR_PLACEHOLDER', selectorColumn);

    const db = db_model.openDB();
    return db.prepare(query).all([value, selectorValue]) as { id: number }[];
  }

  // ==================== GET ====================

  /**
   * Retrieves progressions from the database with the given filters.
   *
   * @memberof Progression
   * @method getProgressionsRawFormat
   * @static
   *
   * @param {ProgressionSelectRequestFilters} filters - The filters to apply to the query.
   * @returns {ProgressionRow[]} - An array of progressions in raw format.
   */
  static getProgressionsRawFormat(filters: ProgressionSelectRequestFilters): ProgressionRow[] {
    const db = db_model.openDB();
    let query = 'SELECT * FROM progressions';
    let where = [];
    let values = [];

    if (filters.name) {
      where.push('name = ?');
      values.push(filters.name);
    }

    if (filters.type) {
      where.push('type = ?');
      values.push(filters.type);
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    if (filters.limit) {
      query += ' LIMIT ?';
      values.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      values.push(filters.offset);
    }

    return db.prepare(query).all(values) as ProgressionRow[];
  }


  /**
   * Retrieves progressions from the database with the given filters.
   *
   * @memberof Progression
   * @method getProgressions
   * @static
   *
   * @param {ProgressionSelectRequestFilters} filters - The filters to apply to the query.
   * @returns {Progression[]} - An array of progressions.
   */
  static getProgressions(filters: ProgressionSelectRequestFilters): Progression[] {
    const rows = Progression.getProgressionsRawFormat(filters);
    return rows.map((row) => Progression.fromRow(row));
  }

}

function parseUpdateFilters(filters: ProgressionSelectRequestFilters): [string, string] {
  let selectorValue: string;
  let selectorColumn: string;
  if (filters.name) {
    selectorColumn = ' name = ?';
    selectorValue = filters.name;
  } else if (filters.type) {
    selectorColumn = ' type = ?';
    selectorValue = filters.type;
  } else {
    throw new Error('No filters provided');
  }
  return [selectorColumn, selectorValue];
}

export default Progression;
