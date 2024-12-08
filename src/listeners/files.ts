/**
 * File events listeners for achievements extension
 *
 * @namespace fileListeners
 * @author BoxBoxJason
 */

import * as vscode from 'vscode';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';
import path from 'path';
import logger from '../utils/logger';

/**
 * File related events listeners functions and handlers
 *
 * @namespace fileListeners
 * @function createFileListeners - Create file related events listeners
 * @function handleCreateEvent - Handler for file creation event
 * @function handleDeleteEvent - Handler for file deletion event
 */
export namespace fileListeners {

  /**
   * Create file related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext) : void {
    logger.debug('Activating file listeners');
    // Watcher for resources
    const resourcesWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);

    resourcesWatcher.onDidCreate(handleCreateEvent, null, context.subscriptions);
    resourcesWatcher.onDidDelete(handleDeleteEvent, null, context.subscriptions);
    vscode.workspace.onDidRenameFiles((event) => {
      ProgressionController.increaseProgression(constants.criteria.FILES_RENAMED, event.files.length);
    }, null, context.subscriptions);
    logger.debug('File listeners activated');
  }

  /**
   * Handler for file creation event
   *
   * @memberof fileListeners
   *
   * @param {vscode.Uri} uri - Uri of the created file
   * @returns {void}
   */
  function handleCreateEvent(uri: vscode.Uri): void {
    const stats = vscode.workspace.fs.stat(uri);
    stats.then((stat) => {
      if (stat.type === vscode.FileType.File) {
        // Increase file created count
        ProgressionController.increaseProgression(constants.criteria.FILES_CREATED);

        // Retrieve file extension
        const extension = path.extname(uri.fsPath);
        const language : string = constants.labels.LANGUAGES_EXTENSIONS[extension];
        if (language) {
          // Increase file created language count
          const languageCriteria = constants.criteria.FILES_CREATED_LANGUAGE.replace('%s', language);
          ProgressionController.increaseProgression(languageCriteria);
        }
      } else if (stat.type === vscode.FileType.Directory) {
        // Increase directory created count
        ProgressionController.increaseProgression(constants.criteria.DIRECTORY_CREATED);
      }
    });
  }

  /**
   * Handler for file deletion event
   *
   * @memberof fileListeners
   *
   * @param {vscode.Uri} uri - Uri of the deleted file
   * @returns {void}
   */
  function handleDeleteEvent(uri: vscode.Uri): void {
    ProgressionController.increaseProgression(constants.criteria.RESOURCE_DELETED);
  }

}
