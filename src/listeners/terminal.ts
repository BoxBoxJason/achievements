/**
 * Terminal events listeners for achievements extension
 *
 * @namespace terminalListeners
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';

export namespace terminalListeners {

  export function activate(context: vscode.ExtensionContext): void {
    vscode.window.onDidEndTerminalShellExecution((event : vscode.TerminalShellExecutionEndEvent) => {
      ProgressionController.increaseProgression(constants.criteria.TERMINAL_COMMANDS);
      if (event.exitCode === 0) {
        ProgressionController.increaseProgression(constants.criteria.SUCCESSFUL_TERMINAL_COMMANDS);
      } else {
        ProgressionController.increaseProgression(constants.criteria.FAILED_TERMINAL_COMMANDS);
      }
    }, null, context.subscriptions);
  }

}
