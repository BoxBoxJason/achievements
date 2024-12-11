/**
 * Tasks events listeners for achievements extension
 *
 * @namespace tasklListeners
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';

export namespace taskListeners {

  export function activate(context: vscode.ExtensionContext): void {
    vscode.window.onDidEndTerminalShellExecution((event : vscode.TerminalShellExecutionEndEvent) => {
      ProgressionController.increaseProgression(constants.criteria.TERMINAL_TASKS);
      if (event.exitCode === 0) {
        ProgressionController.increaseProgression(constants.criteria.SUCCESSFUL_TERMINAL_TASKS);
      } else {
        ProgressionController.increaseProgression(constants.criteria.FAILED_TERMINAL_TASKS);
      }
    }, null, context.subscriptions);
  }
}
