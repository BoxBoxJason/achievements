/**
 * Tasks events listeners for achievements extension
 *
 * @namespace taskListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import { config } from "../config/config";
import logger from "../utils/logger";

/**
 * Tasks related events listeners functions and handlers
 *
 * @namespace taskListeners
 * @function activate - Create tasks related events listeners
 */
export namespace taskListeners {
  /**
   * Create tasks related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.TASKS)) {
      logger.info("Starting tasks events listeners");

      vscode.window.onDidEndTerminalShellExecution(
        async (event: vscode.TerminalShellExecutionEndEvent) => {
          await ProgressionController.increaseProgression(
            constants.criteria.TERMINAL_TASKS
          );
          if (event.exitCode === 0) {
            await ProgressionController.increaseProgression(
              constants.criteria.SUCCESSFUL_TERMINAL_TASKS
            );
          } else {
            await ProgressionController.increaseProgression(
              constants.criteria.FAILED_TERMINAL_TASKS
            );
          }
        },
        null,
        context.subscriptions
      );

      logger.debug("Tasks listeners activated");
    } else {
      logger.info("Tasks listeners are disabled");
    }
  }
}
