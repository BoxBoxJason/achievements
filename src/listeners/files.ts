import * as vscode from 'vscode';
import logger from '../utils/logger';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';
import path from 'path';

export namespace listeners {

  export function createFileListeners(context: vscode.ExtensionContext) {
    // Watcher for resources
    const resourcesWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);

    resourcesWatcher.onDidCreate(handleCreateEvent);
    resourcesWatcher.onDidDelete(handleDeleteEvent);
  }

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


  function handleDeleteEvent(uri: vscode.Uri): void {
    ProgressionController.increaseProgression(constants.criteria.RESOURCE_DELETED);
  }

}
