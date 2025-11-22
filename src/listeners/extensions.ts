/**
 * Extensions events listeners for achievements extension
 *
 * @namespace extensionsListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import logger from "../utils/logger";
import { config } from "../config/config";

/**
 * Extensions and Themes related events listeners functions and handlers
 *
 * @namespace extensionsListeners
 * @function activate - Create extensions and themes related events listeners
 */
export namespace extensionsListeners {
  /**
   * Check the total number of installed extensions and themes
   *
   * @memberof extensionsListeners
   * @returns {Promise<void>}
   */
  export async function checkExtensions(): Promise<void> {
    // Check the total number of installed extensions
    const extensionCount = vscode.extensions.all.length;
    await ProgressionController.updateProgression(
      constants.criteria.EXTENSIONS_INSTALLED,
      extensionCount,
      true
    );

    const themesExtensionsCount = vscode.extensions.all.filter(
      (extension) => {
        const contributes = extension.packageJSON.contributes;
        return contributes?.themes;
      }
    ).length;
    await ProgressionController.updateProgression(
      constants.criteria.THEMES_INSTALLED,
      themesExtensionsCount,
      true
    );
  }

  /**
   * Handle theme change event
   *
   * @memberof extensionsListeners
   * @param {vscode.ColorTheme} event - The theme change event
   * @returns {Promise<void>}
   */
  export async function handleThemeChange(event: vscode.ColorTheme): Promise<void> {
    await ProgressionController.increaseProgression(
      constants.criteria.THEME_CHANGED
    );
  }

  /**
   * Create extensions and themes related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.EXTENSIONS)) {
      logger.info("Starting extensions events listeners");

      vscode.extensions.onDidChange(
        checkExtensions,
        null,
        context.subscriptions
      );

      vscode.window.onDidChangeActiveColorTheme(
        handleThemeChange,
        null,
        context.subscriptions
      );

      logger.debug("Extensions listeners activated");

      // Check the total number of installed extensions at the boot
      checkExtensions().catch((err) => logger.error(err));
    } else {
      logger.info("Extensions events listeners are disabled");
    }
  }
}
