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
    // Check that date respects the format YYYY-MM-DD
    if (!this.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error('date must be in the format YYYY-MM-DD');
    }
    this.duration = duration || 0;
    // Check that duration is a positive integer
    if (!Number.isInteger(this.duration) || this.duration < 0) {
      throw new Error('duration must be a positive integer');
    }

    const db = db_model.openDB();
    const statement = db.prepare(DailySession.INSERT_QUERY);
    const info = statement.run(this.date, this.duration);
    if (info.lastInsertRowid) {
      this.id = Number(info.lastInsertRowid);
    }
  }

  public static readonly INSERT_QUERY = `
  INSERT INTO daily_sessions (date, duration) VALUES (?, ?)
  ON CONFLICT(date) DO UPDATE SET duration = duration + excluded.duration`;

  static fromRow(row: DailySessionDict): DailySession {
    return new DailySession(row.date, row.duration);
  }

  increase(duration: number): void {
    const INCREASE_QUERY = `
    UPDATE daily_sessions
    SET duration = duration + ?
    WHERE date = ?`;

    const db = db_model.openDB();
    const statement = db.prepare(INCREASE_QUERY);
    statement.run(duration, this.date);
    this.duration += duration;
  }

  static getRawSessions(firstDate: string, lastDate: string): DailySessionDict[] {
    const db = db_model.openDB();
    const statement = db.prepare(`
    SELECT * FROM daily_sessions
    WHERE date BETWEEN ? AND ?
    ORDER BY date`);
    return statement.all(firstDate, lastDate) as DailySessionDict[];
  }

  static getSessions(firstDate: string, lastDate: string): DailySession[] {
    return this.getRawSessions(firstDate, lastDate).map(DailySession.fromRow);
  }

  static calculateDuration(firstDate: string, lastDate: string): number {
    const db = db_model.openDB();
    const statement = db.prepare(`
    SELECT SUM(duration) as total_duration
    FROM daily_sessions
    WHERE date BETWEEN ? AND ?`);
    return (statement.get(firstDate, lastDate) as any).total_duration as number;
  }
}
