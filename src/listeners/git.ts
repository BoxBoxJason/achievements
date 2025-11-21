/**
 * Git events listeners for achievements extension
 *
 * @namespace gitListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import logger from "../utils/logger";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import { config } from "../config/config";

/**
 * Git related events listeners functions and handlers
 *
 * @namespace gitListeners
 * @function activate - Create git related events listeners
 */
export namespace gitListeners {
  /**
   * Create git related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.GIT)) {
      logger.info("Starting git events listeners");

      const gitExtension = vscode.extensions.getExtension("vscode.git")
        ?.exports;
      if (!gitExtension) {
        logger.error(
          "Git extension not found, git listeners will not be created"
        );
        return;
      }

      const gitAPI = gitExtension.getAPI(1);

      // Handle current workspace repositories commits
      for (const repository of gitAPI.repositories) {
        repository.onDidCommit(
          async () => {
            await ProgressionController.increaseProgression(
              constants.criteria.COMMITS
            );
          },
          null,
          context.subscriptions
        );
      }

      // Handle new repositories commits
      gitAPI.onDidOpenRepository(
        (repository: any) => {
          repository.onDidCommit(
            async () => {
              await ProgressionController.increaseProgression(
                constants.criteria.COMMITS
              );
            },
            null,
            context.subscriptions
          );
        },
        null,
        context.subscriptions
      );

      // Handle push event
      gitAPI.onDidPublish(
        async () => {
          await ProgressionController.increaseProgression(
            constants.criteria.PUSHES
          );
        },
        null,
        context.subscriptions
      );

      logger.debug("Git listeners activated");
    } else {
      logger.info("Git listeners are disabled");
    }
  }
}
