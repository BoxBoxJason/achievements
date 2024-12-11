/**
 * Debug events listeners for achievements extension
 *
 * @namespace debuglListeners
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';

export namespace debugListeners {

  export function activate(context: vscode.ExtensionContext): void {
    vscode.debug.onDidStartDebugSession((event: vscode.DebugSession) => {
      ProgressionController.increaseProgression(constants.criteria.DEBUGGER_SESSIONS);
    }, null, context.subscriptions);

    vscode.debug.onDidChangeBreakpoints((event: vscode.BreakpointsChangeEvent) => {
      event.added.forEach((breakpoint) => {
        ProgressionController.increaseProgression(constants.criteria.BREAKPOINTS);
      });
    });
  }
}
