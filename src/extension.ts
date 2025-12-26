/**
 * Achievements extension for Visual Studio Code main file
 *
 * @author BoxBoxJason
 */
import * as vscode from "vscode";
import { db_model } from "./database/model/model";
import { config } from "./config/config";
import { AchievementsWebview } from "./views/management";
import { fileListeners } from "./listeners/files";
import { gitListeners } from "./listeners/git";
import { timeListeners } from "./listeners/time";
import { tabListeners } from "./listeners/tabs";
import { taskListeners } from "./listeners/tasks";
import { extensionsListeners } from "./listeners/extensions";
import { debugListeners } from "./listeners/debug";
import logger from "./utils/logger";

/**
 * Show UI warning and status bar when running in read-only mode.
 * Exported so tests can call it directly.
 */
export function showReadOnlyUI(context: vscode.ExtensionContext): void {
  const message =
    "Achievements: Running in read-only mode because another VS Code instance is using the database. Achievements won't be tracked.";

  // Show a persistent warning with an action to open settings
  vscode.window
    .showWarningMessage(message, "Open Settings")
    .then((selection) => {
      if (selection === "Open Settings") {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "@ext:boxboxjason.achievements"
        );
      }
    });

  // Add a status bar item to make the state visible at all times
  try {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    statusBarItem.text = "$(lock) Achievements (read-only)";
    statusBarItem.tooltip = message;
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
  } catch (err) {
    // createStatusBarItem might not be available in some test environments
    // ignore errors to avoid crashing activation
    logger.error("Could not create status bar item for readonly UI: " + err);
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // ==================== CONFIG ====================
  config.activate(context);
  let configuration = config.getConfig();

  // ==================== DATABASE ====================
  // hasWriteAccess will be false if another instance has the lock
  let hasWriteAccess = false;
  if (configuration.enabled) {
    hasWriteAccess = await db_model.activate(context);
  }

  // ==================== COMMANDS ====================
  // Warning, do not forget to add each command to the package.json file AND to the subscriptions array

  // Enable command
  const enableCommand = vscode.commands.registerCommand(
    "achievements.enable",
    () => {
      config.enableExtension();
    }
  );
  context.subscriptions.push(enableCommand);

  // Settings command
  const configurationCommand = vscode.commands.registerCommand(
    "achievements.settings",
    () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:boxboxjason.achievements"
      );
    }
  );
  context.subscriptions.push(configurationCommand);

  // Show achievements command, creates a webview panel
  let currentPanel: vscode.WebviewPanel | undefined = undefined;
  const showAchievementsCommand = vscode.commands.registerCommand(
    "achievements.show",
    () => {
      const columnToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
      if (currentPanel) {
        // If we already have a panel, show it in the target column
        currentPanel.reveal(columnToShowIn);
      } else {
        // Otherwise, create a new panel
        currentPanel = AchievementsWebview.setupAchievementsPanel(context);

        // Reset when the current panel is closed
        currentPanel.onDidDispose(
          () => {
            currentPanel = undefined;
          },
          null,
          context.subscriptions
        );
      }
    }
  );
  context.subscriptions.push(showAchievementsCommand);

  // ==================== LISTENERS ====================
  // Only activate listeners if we have write access (not in readonly mode)
  // and we're not in test mode
  if (context.extensionMode !== vscode.ExtensionMode.Test && hasWriteAccess) {
    fileListeners.activate(context);
    gitListeners.activate(context);
    await timeListeners.activate(context);
    tabListeners.activate(context);
    taskListeners.activate(context);
    extensionsListeners.activate(context);
    debugListeners.activate(context);
  } else if (!hasWriteAccess) {
    // If we don't have write access, show a UI warning and keep listeners disabled
    showReadOnlyUI(context);
  }
}

// This method is called when your extension is deactivated
export async function deactivate() {
  await timeListeners.deactivate();
  await db_model.deactivate();
}
