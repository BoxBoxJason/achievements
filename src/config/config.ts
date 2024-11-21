/**
 * Config manager module for achievements extension
 *
 * @module config
 * @date 2024-11-14
 * @author BoxBoxJason
 */

import path from "path";
import fs from "fs";
import logger from "../utils/logger";
import * as vscode from "vscode";


export interface Config {
  enabled: boolean;
  logLevel: string;
  notifications: boolean;
  logDirectory: string;
}

let extensionStorage: string;
let initialized = false;
let appConfig: Config;
const CONFIG_FILENAME = 'extension.json';

export namespace config {

  export function activate(context: vscode.ExtensionContext): void {
    extensionStorage = context.globalStorageUri.fsPath;
    try {
      // Parse the json config file and store it in the appConfig variable
      appConfig = require(path.join(extensionStorage, CONFIG_FILENAME));
    } catch (error) {
      logger.warn(`Failed to load config file: ${error}`);
      appConfig = {
        enabled: true,
        logLevel: 'INFO',
        notifications: true,
        logDirectory: path.join(extensionStorage, 'logs')
      };
      saveConfig();
    }
    logger.setLogLevel(appConfig.logLevel);
    logger.setLogDir(appConfig.logDirectory);
    initialized = true;
  }


  export function saveConfig(): void {
    try {
      // Save the appConfig variable to the json config file
      fs.writeFileSync(path.join(extensionStorage, CONFIG_FILENAME), JSON.stringify(appConfig, null, 4));
    } catch (error) {
      logger.error(`Failed to save config file: ${error}`);
    }
  }


  export function getConfig(): Readonly<Config> {
    if (!initialized) {
      throw new Error('Config module not initialized');
    }
    return appConfig;
  }


  export function enableExtension(enabled: boolean = true): void {
    appConfig.enabled = enabled;
    saveConfig();
    let enabledString = enabled ? 'enabled' : 'disabled';
    let enabledMessage = `Achievement ${enabledString}!`;
    logger.info(enabledMessage);
    vscode.window.showInformationMessage(enabledMessage);
  }


  export function setLogLevel(level: string): void {
    appConfig.logLevel = level;
    logger.setLogLevel(level);
    saveConfig();
  }


  export function setLogDirectory(directory: string): void {
    appConfig.logDirectory = directory;
    logger.setLogDir(directory);
    saveConfig();
  }


  export function openConfiguration(): void {
    if (!initialized) {
      logger.error('Config module not initialized');
      return;
    }

    const configFilePath = path.join(extensionStorage, CONFIG_FILENAME);

    if (!fs.existsSync(configFilePath)) {
      logger.warn('Configuration file does not exist. Creating a new one...');
      saveConfig();
    }

    vscode.workspace.openTextDocument(configFilePath).then((doc) => {
      vscode.window.showTextDocument(doc);
    }, (error) => {
      logger.error(`Failed to open configuration file: ${error}`);
    });
  }


  export function toggleNotifications() {
    appConfig.notifications = !appConfig.notifications;
    saveConfig();
    let notificationString = appConfig.notifications ? 'enabled' : 'disabled';
    let notificationMessage = `Notifications ${notificationString}!`;
    logger.info(notificationMessage);
    if (appConfig.notifications) {
      vscode.window.showInformationMessage(notificationMessage);
    }
  }

}
