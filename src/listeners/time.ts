/**
 * Time events listeners for achievements extension
 *
 * @namespace timeListeners
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { DailySession } from '../database/model/tables/DailySession';
import { TimeSpentController } from '../database/controller/timespent';
import logger from '../utils/logger';
import { config } from '../config/config';
import { constants } from '../constants';

/**
 * Time related events listeners functions and handlers
 *
 * @namespace timeListeners
 * @function activate - Create time related events listeners
 */
export namespace timeListeners {
  let sessionStart: Date | undefined = undefined;
  let dailySession: DailySession | undefined = undefined;

  /**
   * Create time related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.TIME)) {
      logger.info('Starting time events listeners');

      dailySession = getCurrentDailySession();
      sessionStart = new Date();

      // Window focus change event
      vscode.window.onDidChangeWindowState((windowState: vscode.WindowState) => {
        if (windowState.focused) {
          sessionStart = new Date();
        } else {
          if (sessionStart) {
            // Retrieve current daily session
            dailySession = getCurrentDailySession();
            // Process session duration
            const sessionEnd = new Date();
            const sessionDuration = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);
            // Increase daily session duration in the database
            dailySession.increase(sessionDuration);
            sessionStart = undefined;
          }
        }
      }, null, context.subscriptions);

      // Periodic (1 minute) auto save to mitigate data loss
      setInterval(() => {
        logger.debug('CRONJOB: time spent auto save');
        if (sessionStart) {
          const sessionEnd = new Date();
          const sessionDuration = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);
          dailySession = getCurrentDailySession();
          dailySession.increase(sessionDuration);
          sessionStart = sessionEnd;
        }
      }, 60000);

      TimeSpentController.updateTimeSpentFromSessions();
      // Periodic (15 minutes) recompute of the total time spent
      setInterval(() => {
        logger.debug('CRONJOB: time spent update');
        TimeSpentController.updateTimeSpentFromSessions();
      }, 900000);

      logger.debug('Time listeners activated');

    } else {
      logger.info('Time events listeners are disabled');
    }
  }

  /**
   * Get the current daily session, create a new one if none is found
   * 
   * @returns {DailySession} - Current daily session
   * @throws {Error} - Multiple daily sessions found for the same day
   */
  function getCurrentDailySession(): DailySession {
    const currentDay = new Date().toISOString().split('T')[0];
    if (dailySession && dailySession.date === currentDay) {
      return dailySession;
    }

    const dailySessions = DailySession.getSessions(currentDay, currentDay);
    if (dailySessions.length === 0) {
      return new DailySession(currentDay, 0);
    } else if (dailySessions.length > 1) {
      throw new Error('multiple daily sessions found for the same day');
    } else {
      return dailySessions[0];
    }
  }

  /**
   * Deactivate time related events listeners, triggered at extension deactivation
   *
   * @returns {void}
   */
  export function deactivate() {
    logger.debug('Deactivating time listeners');
    if (sessionStart) {
      const sessionEnd = new Date();
      const sessionDuration = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);
      dailySession = getCurrentDailySession();
      dailySession.increase(sessionDuration);
    }
    logger.debug('Time listeners deactivated');
  }
}
