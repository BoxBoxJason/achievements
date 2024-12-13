/**
 * Extensions events listeners for achievements extension
 *
 * @namespace extensionsListeners
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';
import logger from '../utils/logger';
import { config } from '../config/config';

/**
 * Extensions and Themes related events listeners functions and handlers
 *
 * @namespace extensionsListeners
 * @function activate - Create extensions and themes related events listeners
 */
export namespace extensionsListeners {

  /**
   * Create extensions and themes related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (!config.isListenerEnabled(constants.listeners.EXTENSIONS)) {
      logger.info('Starting extensions events listeners');

      vscode.extensions.onDidChange(() => {
        // Check the total number of installed extensions
        const extensionCount = vscode.extensions.all.length;
        ProgressionController.updateProgression(constants.criteria.EXTENSIONS_INSTALLED, extensionCount, true);

        const themesExtensionsCount = vscode.extensions.all.filter(extension => {
          const contributes = extension.packageJSON.contributes;
          return contributes && contributes.themes;
        }).length;
        ProgressionController.updateProgression(constants.criteria.THEMES_INSTALLED, themesExtensionsCount, true);
      }, null, context.subscriptions);

      vscode.window.onDidChangeActiveColorTheme((event: vscode.ColorTheme) => {
        ProgressionController.increaseProgression(constants.criteria.THEME_CHANGED);
      });

      logger.debug('Extensions listeners activated');

      // Check the total number of installed extensions at the boot
      const extensionCount = vscode.extensions.all.length;
      ProgressionController.updateProgression(constants.criteria.EXTENSIONS_INSTALLED, extensionCount, true);

      const themesExtensionsCount = vscode.extensions.all.filter(extension => {
        const contributes = extension.packageJSON.contributes;
        return contributes && contributes.themes;
      }
      ).length;
      ProgressionController.updateProgression(constants.criteria.THEMES_INSTALLED, themesExtensionsCount, true);

    } else {
      logger.info('Extensions events listeners are disabled');
    }

  }
}
