import logger from "../../../utils/logger";
import { db_model } from "../model";

export interface DailySessionDict {
  id?: number;
  date: string;
  duration: number;
}

export class DailySession {
  public id?: number;
  public date: string;
  public duration: number;

  constructor(date?: string, duration?: number) {
    this.date = date || new Date().toISOString().split('T')[0];
    if (!this.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error('date must be in the format YYYY-MM-DD');
    }
    this.duration = duration || 0;
    if (!Number.isInteger(this.duration) || this.duration < 0) {
      throw new Error('duration must be a positive integer');
    }
  }

  /**
   * Synchronizes the DailySession instance with the database.
   * If the session for the given date does not exist, it will be created.
   * If it does exist, the instance will be populated with the existing data.
   * This method is idempotent, meaning it can be called multiple times without changing the result.
   * It will not create duplicate entries in the database.
   *
   * @async
   *
   * @returns {Promise<void>} A promise that resolves when the synchronization is complete.
   * @throws {Error} - If the database operation fails
   */
  async sync() : Promise<void> {
    const result = await db_model.withLock((db) => {
      return db.exec(`SELECT * FROM daily_sessions WHERE date = ?`, [this.date]);
    });
    const existingSession = db_model.parseRows(result)[0] as DailySessionDict;

    if (!existingSession) {
      const result = await db_model.withLock((db) => {
        db.run(DailySession.INSERT_QUERY, [this.date, this.duration]);
        return db.exec('SELECT last_insert_rowid() AS id');
      });
      const lastInsertRowId = (db_model.parseRows(result) as { id : number}[]).at(-1);

      if (lastInsertRowId !== undefined) {
        this.id = Number(lastInsertRowId.id);
      }
    } else {
      // Populate this instance with existing data
      this.id = existingSession.id;
      this.duration = existingSession.duration;
    }
  }

  public static readonly INSERT_QUERY = `
  INSERT INTO daily_sessions (date, duration) VALUES (?, ?)
  ON CONFLICT(date) DO UPDATE SET duration = duration + excluded.duration`;

  /**
   * Creates a new DailySession instance from a database row.
   *
   * @param {DailySessionDict} row - The database row to create the instance from.
   *
   * @returns {DailySession} A new DailySession instance.
   */
  static fromRow(row: DailySessionDict): DailySession {
    return new DailySession(row.date, row.duration);
  }

  public static readonly INCREASE_QUERY = `
    UPDATE daily_sessions
    SET duration = duration + ?
    WHERE date = ?`;

  /**
   * Increases the duration of the session by a specified amount.
   * This method updates the database and the instance's duration property.
   *
   * @async
   *
   * @param {number} duration - The amount to increase the duration by.
   *
   * @returns {Promise<void>} A promise that resolves when the increase is complete.
   * @throws {Error} - If the database operation fails
   */
  async increase(duration: number): Promise<void> {
    await db_model.withLock((db) => {
      db.run(DailySession.INCREASE_QUERY,[duration, this.date]);
    });
    this.duration += duration;
  }

  /**
   * Obtains all sessions in the database between two dates.
   * This method returns an array of DailySession instances.
   * The dates are inclusive.
   *
   * @async
   * @static
   *
   * @param {string} firstDate - The start date in the format YYYY-MM-DD.
   * @param {string} lastDate - The end date in the format YYYY-MM-DD.
   *
   * @returns {Promise<DailySession[]>} A promise that resolves to an array of DailySession instances.
   * @throws {Error} - If the database operation fails
   */
  static async getRawSessions(firstDate: string, lastDate: string): Promise<DailySessionDict[]> {
    const result = await db_model.withLock((db) => {
      return db.exec(`SELECT * FROM daily_sessions
    WHERE date BETWEEN ? AND ?
    ORDER BY date`, [firstDate, lastDate]);
    });
    return db_model.parseRows(result) as DailySessionDict[];
  }

  /**
   * Obtains all sessions in the database between two dates.
   * This method returns an array of DailySession instances.
   * The dates are inclusive.
   *
   * @async
   * @static
   *
   * @param {string} firstDate - The start date in the format YYYY-MM-DD.
   * @param {string} lastDate - The end date in the format YYYY-MM-DD.
   *
   * @returns {Promise<DailySession[]>} A promise that resolves to an array of DailySession instances.
   * @throws {Error} - If the database operation fails
   */
  static async getSessions(firstDate: string, lastDate: string): Promise<DailySession[]> {
    return (await this.getRawSessions(firstDate, lastDate)).map(DailySession.fromRow);
  }

  /**
   * Calculates the total duration of all sessions in the database between two dates.
   * The dates are inclusive.
   *
   * @async
   * @static
   *
   * @param {string} firstDate - The start date in the format YYYY-MM-DD.
   * @param {string} lastDate - The end date in the format YYYY-MM-DD.
   *
   * @returns {Promise<number>} A promise that resolves to the total duration.
   * @throws {Error} - If the database operation fails
   */
  static async calculateDuration(firstDate: string, lastDate: string): Promise<number> {
    const result = await db_model.withLock((db) => {
      return db.exec(`SELECT SUM(duration) as total_duration
    FROM daily_sessions
    WHERE date BETWEEN ? AND ?`, [firstDate, lastDate]);
    });
    return (db_model.parseRows(result) as { total_duration : number }[])[0].total_duration;
  }
}
