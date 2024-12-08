/**
 * Config manager module for achievements extension
 *
 * @namespace config
 * @author BoxBoxJason
 */

import path from "path";
import fs from "fs";
import logger from "../utils/logger";
import * as vscode from "vscode";
import { webview } from "../views/viewconst";

// ==================== TYPES ====================
// Config interface, defines the structure of the config object, always json serializable
export interface Config {
  enabled: boolean;
  logLevel: string;
  notifications: boolean;
  logDirectory: string;
  username: string;
}

// ==================== MODULE VARIABLES ====================
// The path to the global storage directory
let extensionStorage: string;
// Flag to check if the module has been initialized
let initialized = false;
// The config object, stores the configuration of the extension
let appConfig: Config;
// The name of the config file
const CONFIG_FILENAME = 'extension.json';

// ==================== MODULE FUNCTIONS ====================
/**
 * config module functions
 * @namespace config
 *
 * @function activate - Initializes the config module
 * @function saveConfig - Saves the config object to the config file
 * @function getConfig - Returns the config object
 * @function enableExtension - Enables or disables the extension
 * @function setLogLevel - Sets the log level
 * @function setLogDirectory - Sets the log directory
 * @function openConfiguration - Opens the configuration file
 * @function toggleNotifications - Toggles the notifications
 */
export namespace config {

  /**
   * Initializes the config module
   *
   * @memberof config
   * @function activate
   *
   * @param context - The extension context
   * @returns {void}
   */
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
        logDirectory: path.join(extensionStorage, 'logs'),
        username: webview.DEFAULT_USER,
      };
      initialized = true;
      saveConfig();
    }
    logger.setLogLevel(appConfig.logLevel);
    logger.setLogDir(appConfig.logDirectory);
    initialized = true;

    // Prompt the user to set an username if it is the default one
    if (appConfig.username === webview.DEFAULT_USER) {
      handleSetUsername();
    }
  }

  /**
   * Prompts the user to set their username
   *
   * @memberof config
   * @function handleSetUsername
   *
   * @returns {void}
   */
  function handleSetUsername() {
    vscode.window.showInformationMessage('For a better experience, please set your username', 'Set Username').then((selection) => {
      if (selection === 'Set Username') {
        vscode.window.showInputBox({
          prompt: 'Enter your username',
          placeHolder: webview.DEFAULT_USER,
          validateInput: (input) => {
            return input.trim() ? null : 'Username cannot be empty';
          }
        })
          .then((username) => {
            if (username) {
              setUsername(username);
            }
          });
      }
    });
  }

  /**
   * Saves the config object to the config file
   *
   * @memberof config
   * @function saveConfig
   *
   * @returns {void}
   * @throws {Error} - If the module has not been initialized
   */
  export function saveConfig(): void {
    if (!initialized) {
      logger.error('Config module not initialized');
      throw new Error('config module not initialized');
    }
    try {
      // Save the appConfig variable to the json config file
      fs.writeFileSync(path.join(extensionStorage, CONFIG_FILENAME), JSON.stringify(appConfig, null, 4));
    } catch (error) {
      logger.error(`Failed to save config file: ${error}`);
    }
  }

  /**
   * Returns the config object as a readonly object
   *
   * @memberof config
   * @function getConfig
   *
   * @returns {Readonly<Config>} - The config object
   * @throws {Error} - If the module has not been initialized
   */
  export function getConfig(): Readonly<Config> {
    if (!initialized) {
      throw new Error('config module not initialized');
    }
    return appConfig;
  }

  /**
   * Enables or disables the extension
   *
   * @memberof config
   * @function enableExtension
   *
   * @param {boolean} enabled - Whether to enable or disable the extension
   * @returns {void}
   * @throws {Error} - If the module has not been initialized
   */
  export function enableExtension(enabled: boolean = true): void {
    appConfig.enabled = enabled;
    saveConfig();
    let enabledString = enabled ? 'enabled' : 'disabled';
    let enabledMessage = `Achievement ${enabledString}!`;
    logger.info(enabledMessage);
    vscode.window.showInformationMessage(enabledMessage);
  }

  /**
   * Sets the log level
   *
   * @memberof config
   * @function setLogLevel
   *
   * @param {string} level - The log level
   * @returns {void}
   * @throws {Error} - If the module has not been initialized
   */
  export function setLogLevel(level: string): void {
    appConfig.logLevel = level;
    logger.setLogLevel(level);
    saveConfig();
  }

  /**
   * Sets the log directory
   *
   * @memberof config
   * @function setLogDirectory
   *
   * @param {string} directory - The log directory
   * @returns {void}
   * @throws {Error} - If the module has not been initialized
   */
  export function setLogDirectory(directory: string): void {
    appConfig.logDirectory = directory;
    logger.setLogDir(directory);
    saveConfig();
  }

  /**
   * Opens the configuration file
   *
   * @memberof config
   * @function openConfiguration
   *
   * @returns {void}
   * @throws {Error} - If the module has not been initialized
   */
  export function openConfiguration(): void {
    if (!initialized) {
      logger.error('Config module not initialized');
      throw new Error('config module not initialized');
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

  /**
   * Toggles the notifications
   *
   * @memberof config
   * @function toggleNotifications
   *
   * @returns {void}
   * @throws {Error} - If the module has not been initialized
   */
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

  /**
   * Returns whether the notifications are enabled
   *
   * @memberof config
   * @function notificationsEnabled
   *
   * @returns {boolean} - Whether the notifications are enabled
   * @throws {Error} - If the module has not been initialized
   */
  export function notificationsEnabled(): boolean {
    if (!initialized) {
      logger.error('Config module not initialized');
      throw new Error('config module not initialized');
    }
    return appConfig.notifications;
  }

  /**
   * Sets the username
   *
   * @memberof config
   * @function setUsername
   *
   * @param {string} username - The username
   * @returns {void}
   * @throws {Error} - If the module has not been initialized
   * @throws {Error} - If the username is empty
   */
  export function setUsername(username: string): void {
    username = username.trim();
    if (!initialized) {
      logger.error('Config module not initialized');
      throw new Error('config module not initialized');
    }
    if (!username) {
      logger.error('Username cannot be empty');
      throw new Error('username cannot be empty');
    }
    appConfig.username = username;
    saveConfig();
    logger.info(`Username set to: ${username}`);
  }

  /**
   * Returns the username
   *
   * @memberof config
   * @function getUsername
   *
   * @returns {string} - The username
   * @throws {Error} - If the module has not been initialized
   */
  export function getUsername(): string {
    if (!initialized) {
      logger.error('Config module not initialized');
      throw new Error('config module not initialized');
    }
    return appConfig.username;
  }

}
