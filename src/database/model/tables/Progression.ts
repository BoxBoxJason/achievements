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
   * @static
   *
   * @param {any} row - The database row to create an instance from.
   *
   * @returns {Progression} - An instance of Progression.
   */
  static fromRow(row: any): Progression {
    let value = row.value as string | number | Date | boolean;
    switch (row.type) {
      case 'string': case 'text':
        value = row.value.toString();
        break;
      case 'number': case 'integer': case 'float':
        value = Number(row.value);
        break;
      case 'date': case 'datetime':
        value = new Date(row.value);
        break;
      case 'boolean':
        value = Boolean(row.value);
        break;
    }
    return new Progression({
      id: row.id,
      name: row.name,
      value,
      type: row.type,
    });
  }


  /**
   * Retrieves all progressions from the database.
   *
   * @async
   * @static
   *
   * @returns {Promise<Progression[]>} - A promise that resolves to an array of Progression instances.
   * @throws {Error} - If the database query fails.
   */
  static async fromDB(): Promise<Progression[]> {
    const result = await db_model.withLock((db) => {
      return db.exec('SELECT * FROM progressions');
    });
    const rows = db_model.parseRows(result) as ProgressionRow[];
    return rows.map((row) => Progression.fromRow(row));
  }

  // ==================== TO methods ====================

  /**
   * Inserts an instance of Progression into the database.
   *
   * @async
   *
   * @returns {Promise<void>} - A promise that resolves when the insertion is complete.
   */
  async toRow(): Promise<void> {
    const result = await db_model.withLock((db) => {
      db.run(Progression.INSERT_QUERY, [this.name, db_model.toSqlValue(this.value), this.type]);
      // Retrieve the last inserted row id
      return db.exec('SELECT last_insert_rowid() AS id');
    });

    // Update the instance with the new id
    const rows = db_model.parseRows(result) as { id: number }[];
    if (rows.length > 0) {
      this.id = rows[0].id;
    }
  }

  /**
   * Inserts multiple instances of Progression into the database.
   *
   * @async
   * @static
   *
   * @param {Progression[]} progressions - An array of Progression instances to insert.
   *
   * @returns {Promise<void>} - A promise that resolves when the insertion is complete.
   */
  static async toDB(progressions: Progression[]): Promise<void> {
    await db_model.transactionLock((db) => {
      const statement = db.prepare(Progression.INSERT_QUERY);
      for (const progression of progressions) {
        statement.run([progression.name, db_model.toSqlValue(progression.value), progression.type]);
      }
      statement.free();
    });
  }

  // ==================== UPDATE ====================

  /**
   * Achieves achievements related to specific progressions if their criteria are met.
   * Returns an array of newly achieved achievements.
   *
   * @async
   * @static
   *
   * @param {number[]} progressionIds - The IDs of the progressions to process.
   *
   * @returns {Promise<{ id: number; title: string; achievedAt: string }[]>} - A promise that resolves to an array of newly achieved achievements.
   * @throws {Error} - If the database query fails.
   */
  static async achieveCompletedAchievements(progressionIds: number[]): Promise<{ id: number; title: string; achievedAt: string, exp: number }[]> {
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
      RETURNING id, title, achievedAt, exp;
    `;

    const result = await db_model.withLock((db) => {
      return db.exec(updateAchievementsQuery);
    });
    return db_model.parseRows(result) as { id: number; title: string; achievedAt: string; exp: number }[];
  }


  /**
   * Adds a value to the progression.
   *
   * @async
   * @static
   *
   * @param {number} value - The value to add to the progression.
   *
   * @returns {Promise<{ id: number }[]>} - An array of updated progressions
   * @throws {Error} - If the database query fails.
   */
  static async addValue(filters: ProgressionSelectRequestFilters, value: number | string = 1): Promise<{ id: number }[]> {
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

    const [selectorColumn, selectorValue] = parseUpdateFilters(filters);
    const query = ADD_VALUE_QUERY.replace('SELECTOR_PLACEHOLDER', selectorColumn);
    const result = await db_model.withLock((db) => {
      return db.exec(query, [value, value, value, value, value, value, selectorValue]);
    });
    return db_model.parseRows(result) as { id: number }[];
  }

  /**
   * Updates the value of progressions that match the given filter
   *
   * @async
   * @static
   *
   * @param {ProgressionSelectRequestFilters} filters - The filters to apply to the query.
   * @param {string} value - The new value of the progression.
   *
   * @returns {Promise<{ id: number }[]>} - An array of updated progressions
   * @throws {Error} - If the database query fails.
   */
  static async updateValue(filters: ProgressionSelectRequestFilters, value: string, maximize: boolean = false): Promise<{ id: number }[]> {
    const UPDATE_VALUE_QUERY = maximize ? `
      UPDATE progressions
      SET value = ?
      WHERE SELECTOR_PLACEHOLDER AND value < ?
      RETURNING id;
      ` : `
      UPDATE progressions
      SET value = ?
      WHERE SELECTOR_PLACEHOLDER
      RETURNING id;
      `;
    let [selectorColumn, selectorValue] = parseUpdateFilters(filters);
    let query = UPDATE_VALUE_QUERY.replace('SELECTOR_PLACEHOLDER', selectorColumn);

    const result = await db_model.withLock((db) => {
      return db.exec(query, maximize ? [value, selectorValue, value] : [value, selectorValue]);
    });
    return db_model.parseRows(result) as { id: number }[];
  }

  // ==================== GET ====================

  /**
   * Retrieves progressions from the database with the given filters.
   *
   * @async
   * @static
   *
   * @param {ProgressionSelectRequestFilters} filters - The filters to apply to the query.
   *
   * @returns {Promise<ProgressionRow[]>} - A promise that resolves to an array of ProgressionRow instances.
   * @throws {Error} - If the database query fails.
   */
  static async getProgressionsRawFormat(filters: ProgressionSelectRequestFilters): Promise<ProgressionRow[]> {
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
    const result = await db_model.withLock((db) => {
      return db.exec(query, values);
    });
    return db_model.parseRows(result) as ProgressionRow[];
  }

  /**
   * Retrieves progressions from the database with the given filters.
   *
   * @async
   * @static
   *
   * @param {ProgressionSelectRequestFilters} filters - The filters to apply to the query.
   *
   * @returns {Promise<Progression[]>} - A promise that resolves to an array of Progression instances.
   * @throws {Error} - If the database query fails.
   */
  static async getProgressions(filters: ProgressionSelectRequestFilters): Promise<Progression[]> {
    const rows = await Progression.getProgressionsRawFormat(filters);
    return rows.map((row) => Progression.fromRow(row));
  }

}

/**
 * Parses the update filters and returns the selector column and value.
 *
 * @param {ProgressionSelectRequestFilters} filters - The filters to parse.
 *
 * @returns {[string, string]} - The selector column and value.
 * @throws {Error} - If no filters are provided.
 */
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
