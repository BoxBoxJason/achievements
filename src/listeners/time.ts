/**
 * Time events listeners for achievements extension
 *
 * @namespace timeListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { DailySession } from "../database/model/tables/DailySession";
import { TimeSpentController } from "../database/controller/timespent";
import { db_model } from "../database/model/model";
import { ProgressionController } from "../database/controller/progressions";
import logger from "../utils/logger";
import { config } from "../config/config";
import { constants } from "../constants";

// Local-time hour ranges (inclusive start, exclusive end) for flavor achievements
const NIGHT_OWL_START_HOUR = 0;
const NIGHT_OWL_END_HOUR = 4;
const EARLY_BIRD_START_HOUR = 5;
const EARLY_BIRD_END_HOUR = 7;

/**
 * Time related events listeners functions and handlers
 *
 * @namespace timeListeners
 * @function activate - Create time related events listeners
 */
export namespace timeListeners {
  let sessionStart: Date | undefined = undefined;
  let dailySession: DailySession | undefined = undefined;
  let autoSaveInterval: ReturnType<typeof setInterval> | undefined = undefined;
  let recomputeInterval: ReturnType<typeof setInterval> | undefined =
    undefined;

  /**
   * Create time related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  /**
   * Track time spent connected to a remote / container development window,
   * scoped locally to the current remote environment (vscode.env.remoteName).
   *
   * @param {number} sessionDuration - The session duration in seconds
   * @returns {Promise<void>}
   */
  export async function trackRemoteTimeSpent(sessionDuration: number): Promise<void> {
    if (vscode.env.remoteName) {
      await ProgressionController.increaseProgression(
        constants.criteria.REMOTE_TIME_SPENT,
        sessionDuration
      );
    }
  }

  export async function activate(context: vscode.ExtensionContext): Promise<void> {
    if (config.isListenerEnabled(constants.listeners.TIME)) {
      logger.info("Starting time events listeners");

      dailySession = await getCurrentDailySession();
      sessionStart = new Date();
      await trackTimeOfDaySession(sessionStart);

      // Window focus change event
      vscode.window.onDidChangeWindowState(
        handleWindowStateChange,
        null,
        context.subscriptions
      );

      // Periodic (1 minute) auto save to mitigate data loss
      autoSaveInterval = setInterval(async () => {
        logger.debug("CRONJOB: time spent auto save");
        if (sessionStart && db_model.isReady()) {
          const sessionEnd = new Date();
          const sessionDuration = Math.floor(
            (sessionEnd.getTime() - sessionStart.getTime()) / 1000
          );
          dailySession = await getCurrentDailySession();
          await dailySession.increase(sessionDuration);
          await trackRemoteTimeSpent(sessionDuration);
          sessionStart = sessionEnd;
          await TimeSpentController.updateConnectionStreak();
        }
      }, 60000);
      context.subscriptions.push({
        dispose: () => clearInterval(autoSaveInterval),
      });

      await TimeSpentController.updateTimeSpentFromSessions();
      // Periodic (15 minutes) recompute of the total time spent
      recomputeInterval = setInterval(async () => {
        logger.debug("CRONJOB: time spent update");
        if (db_model.isReady()) {
          await TimeSpentController.updateTimeSpentFromSessions();
        }
      }, 900000);
      context.subscriptions.push({
        dispose: () => clearInterval(recomputeInterval),
      });

      logger.debug("Time listeners activated");
    } else {
      logger.info("Time events listeners are disabled");
    }
  }

  export async function handleWindowStateChange(windowState: vscode.WindowState) {
    if (windowState.focused) {
      sessionStart = new Date();
      await trackTimeOfDaySession(sessionStart);
    } else if (sessionStart) {
      // Retrieve current daily session
      dailySession = await getCurrentDailySession();
      // Process session duration
      const sessionEnd = new Date();
      const sessionDuration = Math.floor(
        (sessionEnd.getTime() - sessionStart.getTime()) / 1000
      );
      // Increase daily session duration in the database
      await dailySession.increase(sessionDuration);
      await trackRemoteTimeSpent(sessionDuration);
      sessionStart = undefined;
      await TimeSpentController.updateConnectionStreak();
    }
  }

  /**
   * Track flavor achievements based on the local hour a coding session starts.
   * Exported so tests can call it directly with an arbitrary Date.
   *
   * @param {Date} sessionStartDate - The date/time the session started at
   * @returns {Promise<void>}
   */
  export async function trackTimeOfDaySession(
    sessionStartDate: Date
  ): Promise<void> {
    const hour = sessionStartDate.getHours();
    if (hour >= NIGHT_OWL_START_HOUR && hour < NIGHT_OWL_END_HOUR) {
      await ProgressionController.increaseProgression(
        constants.criteria.NIGHT_OWL_SESSIONS
      );
    } else if (hour >= EARLY_BIRD_START_HOUR && hour < EARLY_BIRD_END_HOUR) {
      await ProgressionController.increaseProgression(
        constants.criteria.EARLY_BIRD_SESSIONS
      );
    }
  }

  /**
   * Get the current daily session, create a new one if none is found
   *
   * @returns {DailySession} - Current daily session
   */
  async function getCurrentDailySession(): Promise<DailySession> {
    const currentDay = new Date().toISOString().split("T")[0];
    if (dailySession?.date === currentDay) {
      return dailySession;
    }

    return await DailySession.getOrCreate(currentDay, 0);
  }

  /**
   * Deactivate time related events listeners, triggered at extension deactivation
   *
   * @returns {void}
   */
  export async function deactivate() {
    logger.debug("Deactivating time listeners");
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = undefined;
    }
    if (recomputeInterval) {
      clearInterval(recomputeInterval);
      recomputeInterval = undefined;
    }
    if (sessionStart) {
      const sessionEnd = new Date();
      const sessionDuration = Math.floor(
        (sessionEnd.getTime() - sessionStart.getTime()) / 1000
      );
      dailySession = await getCurrentDailySession();
      await dailySession.increase(sessionDuration);
      await trackRemoteTimeSpent(sessionDuration);
    }
    logger.debug("Time listeners deactivated");
  }
}
