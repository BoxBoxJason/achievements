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

  private constructor(date: string, duration: number, id?: number) {
    this.date = date;
    this.duration = duration;
    this.id = id;
  }

  static async getOrCreate(
    date?: string,
    duration: number = 0
  ): Promise<DailySession> {
    const dateStr = date || new Date().toISOString().split("T")[0];
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error("date must be in the format YYYY-MM-DD");
    }
    if (!Number.isInteger(duration) || duration < 0) {
      throw new Error("duration must be a positive integer");
    }

    const db = await db_model.getDB();
    const existingSession = db_model.get(
      db,
      `SELECT * FROM daily_sessions WHERE date = ?`,
      [dateStr]
    ) as DailySessionDict;

    if (existingSession) {
      return new DailySession(
        existingSession.date,
        existingSession.duration,
        existingSession.id
      );
    } else {
      const statement = db.prepare(DailySession.INSERT_QUERY);
      statement.run([dateStr, duration]);
      statement.free();
      await db_model.saveDB();

      // Get the inserted ID. Note: In a concurrent environment this might be risky,
      // but sql.js is single threaded and we are in a controlled environment.
      // Better would be to use RETURNING clause if supported or a separate select.
      // SQLite supports RETURNING since 3.35.0. sql.js is based on recent SQLite.
      // Let's try to fetch it back by date which is unique.
      const newSession = db_model.get(
        db,
        `SELECT * FROM daily_sessions WHERE date = ?`,
        [dateStr]
      ) as DailySessionDict;
      return new DailySession(
        newSession.date,
        newSession.duration,
        newSession.id
      );
    }
  }

  public static readonly INSERT_QUERY = `
  INSERT INTO daily_sessions (date, duration) VALUES (?, ?)
  ON CONFLICT(date) DO UPDATE SET duration = duration + excluded.duration`;

  static fromRow(row: DailySessionDict): DailySession {
    return new DailySession(row.date, row.duration, row.id);
  }

  async increase(duration: number): Promise<void> {
    const INCREASE_QUERY = `
    UPDATE daily_sessions
    SET duration = duration + ?
    WHERE date = ?`;

    const db = await db_model.getDB();
    const statement = db.prepare(INCREASE_QUERY);
    statement.run([duration, this.date]);
    statement.free();
    await db_model.saveDB();
    this.duration += duration;
  }

  static async getRawSessions(
    firstDate: string,
    lastDate: string
  ): Promise<DailySessionDict[]> {
    const db = await db_model.getDB();
    return db_model.getAll(
      db,
      `
    SELECT * FROM daily_sessions
    WHERE date BETWEEN ? AND ?
    ORDER BY date`,
      [firstDate, lastDate]
    ) as DailySessionDict[];
  }

  static async getSessions(
    firstDate: string,
    lastDate: string
  ): Promise<DailySession[]> {
    const rawSessions = await this.getRawSessions(firstDate, lastDate);
    return rawSessions.map(DailySession.fromRow);
  }

  static async calculateDuration(
    firstDate: string,
    lastDate: string
  ): Promise<number> {
    const db = await db_model.getDB();
    const res = db_model.get(
      db,
      `
    SELECT SUM(duration) as total_duration
    FROM daily_sessions
    WHERE date BETWEEN ? AND ?`,
      [firstDate, lastDate]
    );
    return res.total_duration as number;
  }
}
