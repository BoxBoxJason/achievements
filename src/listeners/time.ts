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

export namespace timeListeners {
  let sessionStart: Date | undefined = undefined;
  let dailySession: DailySession | undefined = undefined;

  export function activate(context: vscode.ExtensionContext): void {
    logger.debug('Activating time listeners');
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

    // Periodic (15 minutes) recompute of the total time spent
    setInterval(() => {
      logger.debug('CRONJOB: time spent update');
      TimeSpentController.updateTimeSpentFromSessions();
    }, 900000);
    logger.debug('Time listeners activated');
  }

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
