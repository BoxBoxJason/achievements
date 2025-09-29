/**
 * Tab events listeners for achievements extension
 *
 * @namespace tabListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import logger from "../utils/logger";
import { config } from "../config/config";

/**
 * Tabs related events listeners functions and handlers
 *
 * @namespace tabListeners
 * @function activate - Create tabs related events listeners
 */
export namespace tabListeners {
  /**
   * Create tabs related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.TABS)) {
      logger.info("Starting tabs events listeners");

      vscode.window.tabGroups.onDidChangeTabs(
        () => {
          const tabCount = vscode.window.tabGroups.all.reduce(
            (count, group) => count + group.tabs.length,
            0
          );
          ProgressionController.updateProgression(
            constants.criteria.NUMBER_OF_SIMULTANEOUS_TABS,
            tabCount
          );
        },
        null,
        context.subscriptions
      );

      logger.debug("Tabs listeners activated");
    } else {
      logger.info("Tabs listeners are disabled");
    }
  }
}
