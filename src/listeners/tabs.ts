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

let hasMultiCursorSelection = false;

/**
 * Tabs related events listeners functions and handlers
 *
 * @namespace tabListeners
 * @function activate - Create tabs related events listeners
 * @function handleTabsChangedEvent - Handler for tab groups/tabs changes
 * @function handleSelectionChangedEvent - Handler for text editor selection changes
 * @function handleTerminalOpenedEvent - Handler for terminal opened event
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
        handleTabsChangedEvent,
        null,
        context.subscriptions,
      );

      vscode.window.onDidChangeTextEditorSelection(
        handleSelectionChangedEvent,
        null,
        context.subscriptions,
      );

      vscode.window.onDidOpenTerminal(
        handleTerminalOpenedEvent,
        null,
        context.subscriptions,
      );

      logger.debug("Tabs listeners activated");
    } else {
      logger.info("Tabs listeners are disabled");
    }
  }

  /**
   * Handler for tab groups/tabs changes.
   * Tracks the number of simultaneously opened tabs and editor groups.
   *
   * @memberof tabListeners
   *
   * @returns {Promise<void>}
   */
  export async function handleTabsChangedEvent(): Promise<void> {
    const tabGroups = vscode.window.tabGroups.all;
    const tabCount = tabGroups.reduce(
      (count, group) => count + group.tabs.length,
      0,
    );
    await ProgressionController.updateProgression(
      constants.criteria.NUMBER_OF_SIMULTANEOUS_TABS,
      tabCount,
    );
    await ProgressionController.updateProgression(
      constants.criteria.NUMBER_OF_SIMULTANEOUS_EDITOR_GROUPS,
      tabGroups.length,
    );
  }

  /**
   * Handler for text editor selection changes.
   * Detects the transition from a single cursor to multi-cursor editing so a
   * multi-cursor session is only counted once per continuous use, rather than
   * on every subsequent selection-changed tick.
   *
   * @memberof tabListeners
   *
   * @param {vscode.TextEditorSelectionChangeEvent} event - Selection change event
   * @returns {Promise<void>}
   */
  export async function handleSelectionChangedEvent(
    event: vscode.TextEditorSelectionChangeEvent,
  ): Promise<void> {
    if (event.selections.length > 1) {
      if (!hasMultiCursorSelection) {
        hasMultiCursorSelection = true;
        await ProgressionController.increaseProgression(
          constants.criteria.MULTI_CURSOR_SESSIONS,
        );
      }
    } else {
      hasMultiCursorSelection = false;
    }
  }

  /**
   * Handler for terminal opened event
   *
   * @memberof tabListeners
   *
   * @returns {Promise<void>}
   */
  export async function handleTerminalOpenedEvent(): Promise<void> {
    await ProgressionController.increaseProgression(
      constants.criteria.TERMINALS_OPENED,
    );
  }
}
