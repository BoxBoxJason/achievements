import { DailySession } from "../model/tables/DailySession";
import { constants } from "../../constants";
import logger from "../../utils/logger";
import { ProgressionController } from "./progressions";
import Progression from "../model/tables/Progression";

/**
 * Controller for the time spent counters
 */
export namespace TimeSpentController {
  /**
   * Update the time spent counters from the sessions
   * This function will update the daily, bi-monthly, monthly, yearly and total time spent counters
   *
   * @returns {Promise<void>}
   */
  export async function updateTimeSpentFromSessions(): Promise<void> {
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split("T")[0];

    const fourteenDaysAgo = new Date(
      currentDate.getTime() - 14 * 24 * 60 * 60 * 1000
    );
    const fourteenDaysAgoString = fourteenDaysAgo.toISOString().split("T")[0];

    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const firstDayOfMonthString = firstDayOfMonth.toISOString().split("T")[0];

    const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const firstDayOfYearString = firstDayOfYear.toISOString().split("T")[0];

    logger.debug("JOB: Updating time spent counters");

    const stats = await DailySession.getStatsSummary(
      currentDateString,
      fourteenDaysAgoString,
      firstDayOfMonthString,
      firstDayOfYearString
    );

    await ProgressionController.updateProgressions([
      {
        name: constants.criteria.DAILY_TIME_SPENT,
        value: stats.daily.toString(),
      },
      {
        name: constants.criteria.TWO_WEEKS_TIME_SPENT,
        value: stats.twoWeeks.toString(),
      },
      {
        name: constants.criteria.MONTHLY_TIME_SPENT,
        value: stats.monthly.toString(),
      },
      {
        name: constants.criteria.YEARLY_TIME_SPENT,
        value: stats.yearly.toString(),
      },
      {
        name: constants.criteria.TOTAL_TIME_SPENT,
        value: stats.total.toString(),
      },
    ]);

    logger.debug("JOB: Time spent counters updated");
  }

  /**
   * Get the time spent counters
   * This function will return the daily, bi-monthly, monthly, yearly and total time spent counters
   *
   * @returns { [key: string]: number } - The time spent counters
   */
  export function getTimeSpent(progressions: { [key: string]: number }): {
    [key: string]: number;
  } {
    const toLookFor = [
      constants.criteria.DAILY_TIME_SPENT,
      constants.criteria.TWO_WEEKS_TIME_SPENT,
      constants.criteria.MONTHLY_TIME_SPENT,
      constants.criteria.YEARLY_TIME_SPENT,
      constants.criteria.TOTAL_TIME_SPENT,
    ] as string[];
    return Object.fromEntries(
      Object.entries(progressions).filter(([key, value]) =>
        toLookFor.includes(key)
      )
    );
  }

  /**
   * Update the connection streak
   *
   * @returns {Promise<void>}
   */
  export async function updateConnectionStreak(): Promise<void> {
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split("T")[0];

    // Check if we already updated the streak today
    const lastStreakDateProgressions = await Progression.getProgressions({
      name: constants.criteria.LAST_STREAK_DATE,
    });
    const lastStreakDateProgression = lastStreakDateProgressions[0];

    if (lastStreakDateProgression?.value === currentDateString) {
      return;
    }

    // Get today's session
    const todaySession = await DailySession.getOrCreate(currentDateString);
    if (todaySession.duration <= 0) {
      return;
    }

    // Get yesterday's session
    const yesterdayDate = new Date(currentDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateString = yesterdayDate.toISOString().split("T")[0];

    const yesterdaySession = await DailySession.getOrCreate(
      yesterdayDateString
    );

    let newStreak = 1;

    if (yesterdaySession.duration > 0) {
      const currentStreakProgressions = await Progression.getProgressions({
        name: constants.criteria.CURRENT_CONNECTION_STREAK,
      });
      const currentStreakProgression = currentStreakProgressions[0];
      const currentStreak = currentStreakProgression
        ? Number.parseInt(currentStreakProgression.value as string)
        : 0;

      newStreak = currentStreak + 1;
    }

    // Update current streak
    await ProgressionController.updateProgression(
      constants.criteria.CURRENT_CONNECTION_STREAK,
      newStreak
    );

    // Update max streak
    await ProgressionController.updateProgression(
      constants.criteria.MAX_CONNECTION_STREAK,
      newStreak,
      true
    );

    // Update last streak date
    await ProgressionController.updateProgression(
      constants.criteria.LAST_STREAK_DATE,
      currentDateString
    );
  }
}
