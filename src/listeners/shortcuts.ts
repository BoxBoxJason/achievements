/**
 * Shortcut events listeners for achievements extension.
 * Tracks paste operations (Copy Ninja).
 *
 * @namespace shortcutsListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import logger from "../utils/logger";
import { config } from "../config/config";
import { shouldIgnoreUri } from "./files";

/**
 * Shortcut related events listeners functions and handlers
 *
 * @namespace shortcutsListeners
 * @function activate - Create shortcut related events listeners
 */
export namespace shortcutsListeners {
  /**
   * Document paste edit provider used only for its side effect of tracking
   * paste operations. It never replaces the default paste behavior.
   *
   * @memberof shortcutsListeners
   */
  export class AchievementsPasteEditProvider
    implements vscode.DocumentPasteEditProvider
  {
    provideDocumentPasteEdits(
      document: vscode.TextDocument,
      _ranges: readonly vscode.Range[],
      _dataTransfer: vscode.DataTransfer,
      _context: vscode.DocumentPasteEditContext,
      _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.DocumentPasteEdit[]> {
      if (!shouldIgnoreUri(document.uri)) {
        ProgressionController.increaseProgression(
          constants.criteria.NUMBER_OF_PASTES,
        ).catch((err: unknown) => logger.error(err));
      }
      // Returning undefined lets VS Code perform the default, unmodified
      // paste - this handler never alters editor content.
      return undefined;
    }
  }

  /**
   * Create shortcut related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.SHORTCUTS)) {
      logger.info("Starting shortcuts events listeners");

      context.subscriptions.push(
        vscode.languages.registerDocumentPasteEditProvider(
          { scheme: "file" },
          new AchievementsPasteEditProvider(),
          {
            providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Text],
            pasteMimeTypes: ["text/plain"],
          },
        ),
      );

      logger.debug("Shortcuts listeners activated");
    } else {
      logger.info("Shortcuts listeners are disabled");
    }
  }
}
