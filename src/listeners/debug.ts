/**
 * Debug events listeners for achievements extension
 *
 * @namespace debuglListeners
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';
import { config } from '../config/config';
import logger from '../utils/logger';

/**
 * debug and breakpoints related events listeners functions and handlers
 *
 * @namespace debugListeners
 * @function activate - Create debug and breakpoints related events listeners
 */
export namespace debugListeners {

  /**
   * Create debug and breakpoints related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (!config.isListenerEnabled(constants.listeners.DEBUG)) {
      logger.info('Starting debug events listeners');

      vscode.debug.onDidStartDebugSession((event: vscode.DebugSession) => {
        ProgressionController.increaseProgression(constants.criteria.DEBUGGER_SESSIONS);
      }, null, context.subscriptions);

      vscode.debug.onDidChangeBreakpoints((event: vscode.BreakpointsChangeEvent) => {
        event.added.forEach((breakpoint) => {
          ProgressionController.increaseProgression(constants.criteria.BREAKPOINTS);
        });
      });

      logger.debug('Debug listeners activated');

    } else {
      logger.info('Debug events listeners are disabled');
    }
  }
}
