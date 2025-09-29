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

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // ==================== CONFIG ====================
  config.activate(context);
  let configuration = config.getConfig();

  // ==================== DATABASE ====================
  if (configuration.enabled) {
    db_model.activate(context);
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
  fileListeners.activate(context);
  gitListeners.activate(context);
  timeListeners.activate(context);
  tabListeners.activate(context);
  taskListeners.activate(context);
  extensionsListeners.activate(context);
  debugListeners.activate(context);
}

// This method is called when your extension is deactivated
export function deactivate() {
  timeListeners.deactivate();
  db_model.deactivate();
}
