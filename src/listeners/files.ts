/**
 * File events listeners for achievements extension
 *
 * @namespace fileListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import path from "node:path";
import logger from "../utils/logger";
import { config } from "../config/config";

const DEFAULT_IGNORED_FILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".ds_store",
  "thumbs.db",
];

const DEFAULT_IGNORED_DIRECTORIES = [
  ".git",
  ".svn",
  ".hg",
  ".jj",
  "node_modules",
];

/**
 * Check if a given URI should be ignored for progression counting based on its path and file name.
 *
 * @param {vscode.Uri} uri - The URI to check
 * @returns {boolean} True if the URI should be ignored, false otherwise
 */
function shouldIgnoreUri(uri: vscode.Uri): boolean {
  if (uri.scheme !== "file") {
    return true;
  }

  const extensionRawConfig = vscode.workspace.getConfiguration("achievements");
  const ignoredDirectoryNames = new Set(
    extensionRawConfig
      .get<string[]>("ignore.directories", DEFAULT_IGNORED_DIRECTORIES)
      .filter((name) => typeof name === "string")
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
  );
  const ignoredFileNames = new Set(
    extensionRawConfig
      .get<string[]>("ignore.files", DEFAULT_IGNORED_FILES)
      .filter((name) => typeof name === "string")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0),
  );

  const normalizedPath = path.normalize(uri.fsPath);
  const segments = normalizedPath.split(path.sep);

  if (segments.some((segment) => ignoredDirectoryNames.has(segment))) {
    return true;
  }

  const fileName = path.basename(normalizedPath).toLowerCase();
  return ignoredFileNames.has(fileName);
}

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
        false,
      );

      resourcesWatcher.onDidCreate(
        handleCreateEvent,
        null,
        context.subscriptions,
      );
      resourcesWatcher.onDidDelete(
        handleDeleteEvent,
        null,
        context.subscriptions,
      );
      vscode.workspace.onDidRenameFiles(
        handleRenameEvent,
        null,
        context.subscriptions,
      );

      // Text document changes
      vscode.workspace.onDidChangeTextDocument(
        handleTextChangedEvent,
        null,
        context.subscriptions,
      );
      // Diagnostics changes
      vscode.languages.onDidChangeDiagnostics(
        handleDiagnosticChangedEvent,
        null,
        context.subscriptions,
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
   * @returns {Promise<void>}
   */
  export async function handleCreateEvent(uri: vscode.Uri): Promise<void> {
    if (shouldIgnoreUri(uri)) {
      return;
    }

    const stats = await vscode.workspace.fs.stat(uri);
    if (stats.type === vscode.FileType.File) {
      // Increase file created count
      await ProgressionController.increaseProgression(
        constants.criteria.FILES_CREATED,
      );

      // Retrieve file extension
      const extension = path.extname(uri.fsPath);
      const language: string = constants.labels.LANGUAGES_EXTENSIONS[extension];
      if (language) {
        // Increase file created language count
        const languageCriteria =
          constants.criteria.FILES_CREATED_LANGUAGE.replace("%s", language);
        await ProgressionController.increaseProgression(languageCriteria);
      }
    } else if (stats.type === vscode.FileType.Directory) {
      // Increase directory created count
      await ProgressionController.increaseProgression(
        constants.criteria.DIRECTORY_CREATED,
      );
    }
  }

  /**
   * Handler for file deletion event
   *
   * @memberof fileListeners
   *
   * @param {vscode.Uri} uri - Uri of the deleted file
   * @returns {Promise<void>}
   */
  export async function handleDeleteEvent(uri: vscode.Uri): Promise<void> {
    if (shouldIgnoreUri(uri)) {
      return;
    }

    await ProgressionController.increaseProgression(
      constants.criteria.RESOURCE_DELETED,
    );
  }

  /**
   * Handler for file rename event
   *
   * @memberof fileListeners
   *
   * @param {vscode.FileRenameEvent} event - File rename event
   * @returns {Promise<void>}
   */
  export async function handleRenameEvent(
    event: vscode.FileRenameEvent,
  ): Promise<void> {
    const relevantFileCount = event.files.filter(
      ({ oldUri, newUri }) =>
        !shouldIgnoreUri(oldUri) && !shouldIgnoreUri(newUri),
    ).length;

    if (relevantFileCount === 0) {
      return;
    }

    await ProgressionController.increaseProgression(
      constants.criteria.FILES_RENAMED,
      relevantFileCount,
    );
  }

  /**
   * Handler for text document change event
   *
   * @memberof fileListeners
   *
   * @param {vscode.TextDocumentChangeEvent} event - Text document change event
   * @returns {Promise<void>}
   */
  export async function handleTextChangedEvent(
    event: vscode.TextDocumentChangeEvent,
  ): Promise<void> {
    if (shouldIgnoreUri(event.document.uri)) {
      return;
    }

    const language =
      constants.labels.LANGUAGES_EXTENSIONS[
        path.extname(event.document.fileName)
      ];
    if (language) {
      let totalLinesAdded = 0;
      for (const change of event.contentChanges) {
        totalLinesAdded += countLinesAdded(change);
      }

      if (totalLinesAdded > 0) {
        // Increment progression for the added lines
        await ProgressionController.increaseProgression(
          constants.criteria.LINES_OF_CODE_LANGUAGE.replace("%s", language),
          totalLinesAdded,
        );
        // Increment generic lines of code progression
        await ProgressionController.increaseProgression(
          constants.criteria.LINES_OF_CODE,
          totalLinesAdded,
        );
      }
    }
  }

  function countLinesAdded(
    change: vscode.TextDocumentContentChangeEvent,
  ): number {
    // Check if the change involves adding new lines
    if (change.text.includes("\n")) {
      const nonEmptyLinesCount = change.text
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0).length;

      if (nonEmptyLinesCount > 0) {
        return nonEmptyLinesCount;
      }
      return 1;
    }
    return 0;
  }

  let fileErrorCounts = new Map<string, number>();
  let errorCounterFree = true;

  export async function handleDiagnosticChangedEvent(
    event: vscode.DiagnosticChangeEvent,
  ): Promise<void> {
    if (errorCounterFree) {
      errorCounterFree = false;
      for (const uri of event.uris) {
        if (shouldIgnoreUri(uri)) {
          continue;
        }

        const errorCount = vscode.languages
          .getDiagnostics(uri)
          .filter(
            (diagnostic) =>
              diagnostic.severity === vscode.DiagnosticSeverity.Error,
          ).length;
        const filePath = uri.fsPath;
        const previousErrorCount = fileErrorCounts.get(filePath);
        if (previousErrorCount !== undefined) {
          if (errorCount < previousErrorCount) {
            await ProgressionController.increaseProgression(
              constants.criteria.ERRORS_FIXED,
              previousErrorCount - errorCount,
            );
          }
        }
        fileErrorCounts.set(filePath, errorCount);
      }
      errorCounterFree = true;
    }
  }
}
