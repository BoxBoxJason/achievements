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

export namespace extensionsListeners {

  export function activate(context: vscode.ExtensionContext): void {
    logger.debug('Activating extensions listeners');
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

    vscode.window.onDidChangeActiveColorTheme((event : vscode.ColorTheme) => {
      ProgressionController.increaseProgression(constants.criteria.THEME_CHANGED);
    });

  }
}
