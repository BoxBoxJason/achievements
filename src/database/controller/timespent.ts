import { DailySession } from "../model/tables/DailySession";
import { constants } from '../../constants';
import logger from "../../utils/logger";
import { ProgressionController } from "./progressions";


export namespace TimeSpentController {

  export function updateTimeSpentFromSessions() : void {
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split('T')[0];
    // Update the daily counter
    logger.debug('JOB: Updating daily time spent');
    const dailyTimeSpent = DailySession.calculateDuration(currentDateString, currentDateString);
    ProgressionController.updateProgression(constants.criteria.DAILY_TIME_SPENT, dailyTimeSpent.toString());

    // Update the bi-monthly counter
    logger.debug('JOB: Updating bi-monthly time spent');
    const fourteenDaysAgo = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgoString = fourteenDaysAgo.toISOString().split('T')[0];
    const biMonthlyTimeSpent = DailySession.calculateDuration(fourteenDaysAgoString, currentDateString);
    ProgressionController.updateProgression(constants.criteria.TWO_WEEKS_TIME_SPENT, biMonthlyTimeSpent.toString());

    // Update the monthly counter
    logger.debug('JOB: Updating monthly time spent');
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDayOfMonthString = firstDayOfMonth.toISOString().split('T')[0];
    const monthlyTimeSpent = DailySession.calculateDuration(firstDayOfMonthString, currentDateString);
    ProgressionController.updateProgression(constants.criteria.MONTHLY_TIME_SPENT, monthlyTimeSpent.toString());

    // Update the yearly counter
    logger.debug('JOB: Updating yearly time spent');
    const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const firstDayOfYearString = firstDayOfYear.toISOString().split('T')[0];
    const yearlyTimeSpent = DailySession.calculateDuration(firstDayOfYearString, currentDateString);
    ProgressionController.updateProgression(constants.criteria.YEARLY_TIME_SPENT, yearlyTimeSpent.toString());

    // Update the total counter
    logger.debug('JOB: Updating total time spent');
    const totalDuration = DailySession.calculateDuration('1970-01-01', currentDateString);
    ProgressionController.updateProgression(constants.criteria.TOTAL_TIME_SPENT, totalDuration.toString());

    logger.debug('JOB: Time spent counters updated');
  }

}
