/**
 * File events listeners for achievements extension
 *
 * @namespace fileListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import path from "path";
import logger from "../utils/logger";
import { config } from "../config/config";

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
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.FILES)) {
      logger.info("Starting file events listeners");

      // Watcher for resources
      const resourcesWatcher = vscode.workspace.createFileSystemWatcher(
        "**/*",
        false,
        false,
        false
      );

      resourcesWatcher.onDidCreate(
        handleCreateEvent,
        null,
        context.subscriptions
      );
      resourcesWatcher.onDidDelete(
        handleDeleteEvent,
        null,
        context.subscriptions
      );
      vscode.workspace.onDidRenameFiles(
        handleRenameEvent,
        null,
        context.subscriptions
      );

      // Text document changes
      vscode.workspace.onDidChangeTextDocument(
        handleTextChangedEvent,
        null,
        context.subscriptions
      );
      // Diagnostics changes
      vscode.languages.onDidChangeDiagnostics(
        handleDiagnosticChangedEvent,
        null,
        context.subscriptions
      );

      logger.debug("File listeners activated");
    } else {
      logger.info("File listeners are disabled");
    }
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
        ProgressionController.increaseProgression(
          constants.criteria.FILES_CREATED
        );

        // Retrieve file extension
        const extension = path.extname(uri.fsPath);
        const language: string =
          constants.labels.LANGUAGES_EXTENSIONS[extension];
        if (language) {
          // Increase file created language count
          const languageCriteria =
            constants.criteria.FILES_CREATED_LANGUAGE.replace("%s", language);
          ProgressionController.increaseProgression(languageCriteria);
        }
      } else if (stat.type === vscode.FileType.Directory) {
        // Increase directory created count
        ProgressionController.increaseProgression(
          constants.criteria.DIRECTORY_CREATED
        );
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
    ProgressionController.increaseProgression(
      constants.criteria.RESOURCE_DELETED
    );
  }

  /**
   * Handler for file rename event
   *
   * @memberof fileListeners
   *
   * @param {vscode.FileRenameEvent} event - File rename event
   * @returns {void}
   */
  function handleRenameEvent(event: vscode.FileRenameEvent): void {
    ProgressionController.increaseProgression(
      constants.criteria.FILES_RENAMED,
      event.files.length
    );
  }

  /**
   * Handler for text document change event
   *
   * @memberof fileListeners
   *
   * @param {vscode.TextDocumentChangeEvent} event - Text document change event
   * @returns {void}
   */
  function handleTextChangedEvent(event: vscode.TextDocumentChangeEvent): void {
    const language =
      constants.labels.LANGUAGES_EXTENSIONS[
        path.extname(event.document.fileName)
      ];
    if (language) {
      event.contentChanges.forEach((change) => {
        // Check if the change involves adding new lines
        if (change.text.includes("\n")) {
          if (change.range.isSingleLine) {
            // Increment progression for the added line
            ProgressionController.increaseProgression(
              constants.criteria.LINES_OF_CODE_LANGUAGE.replace("%s", language)
            );
          } else {
            // Count non-empty lines added in the change
            const nonEmptyLinesCount = change.text
              .split(/\r?\n/)
              .filter((line) => line.trim().length > 0).length;

            // Increment progression for the added lines
            if (nonEmptyLinesCount > 0) {
              ProgressionController.increaseProgression(
                constants.criteria.LINES_OF_CODE_LANGUAGE.replace(
                  "%s",
                  language
                ),
                nonEmptyLinesCount
              );
            }
          }
        }
      });
    }
  }

  let fileErrorCounts = new Map<string, number>();
  let errorCounterFree = true;

  function handleDiagnosticChangedEvent(
    event: vscode.DiagnosticChangeEvent
  ): void {
    if (errorCounterFree) {
      errorCounterFree = false;
      event.uris.forEach((uri) => {
        const errorCount = vscode.languages
          .getDiagnostics(uri)
          .filter(
            (diagnostic) =>
              diagnostic.severity === vscode.DiagnosticSeverity.Error
          ).length;
        const filePath = uri.fsPath;
        const previousErrorCount = fileErrorCounts.get(filePath);
        if (previousErrorCount !== undefined) {
          if (errorCount < previousErrorCount) {
            ProgressionController.increaseProgression(
              constants.criteria.ERRORS_FIXED,
              previousErrorCount - errorCount
            );
          }
        }
        fileErrorCounts.set(filePath, errorCount);
      });
      errorCounterFree = true;
    }
  }
}
