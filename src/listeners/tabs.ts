/**
 * Tab events listeners for achievements extension
 *
 * @namespace tabListeners
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';

export namespace tabListeners {

  export function activate(context: vscode.ExtensionContext): void {
    vscode.window.tabGroups.onDidChangeTabs(() => {
      const tabCount = vscode.window.tabGroups.all.reduce((count, group) => count + group.tabs.length, 0);
      ProgressionController.updateProgression(constants.criteria.NUMBER_OF_SIMULTANEOUS_TABS, tabCount);
    }, null, context.subscriptions);
  }
}
