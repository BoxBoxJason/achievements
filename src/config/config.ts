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
  listeners: {
    debug: boolean;
    extensions: boolean;
    files: boolean;
    git: boolean;
    tabs: boolean;
    tasks: boolean;
    time: boolean;
  }
}

// ==================== VARIABLES ====================
let defaultLogDir : string = '';

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
    defaultLogDir = path.join(context.globalStorageUri.fsPath, 'logs');

    const config = getConfig();
    logger.setLogLevel(config.logLevel);
    logger.setLogDir(config.logDirectory);

    // Prompt the user to set an username if it is the default one
    if (config.username === webview.DEFAULT_USER) {
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
   * Returns the config object as a readonly object
   *
   * @memberof config
   * @function getConfig
   *
   * @returns {Readonly<Config>} - The config object
   * @throws {Error} - If the module has not been initialized
   */
  export function getConfig(): Readonly<Config> {
    const extensionRawConfig = vscode.workspace.getConfiguration('achievements');
    let extensionConfig : Config = {
      enabled: extensionRawConfig.get<boolean>('enabled', true),
      logLevel: extensionRawConfig.get<string>('logLevel', 'info'),
      notifications: extensionRawConfig.get<boolean>('notifications', true),
      logDirectory: extensionRawConfig.get<string>('logDirectory', defaultLogDir).trim(),
      username: extensionRawConfig.get<string>('username', webview.DEFAULT_USER).trim(),
      listeners: {
        debug: extensionRawConfig.get<boolean>('listeners.debug', true),
        extensions: extensionRawConfig.get<boolean>('listeners.extensions', true),
        files: extensionRawConfig.get<boolean>('listeners.files', true),
        git: extensionRawConfig.get<boolean>('listeners.git', true),
        tabs: extensionRawConfig.get<boolean>('listeners.tabs', true),
        tasks: extensionRawConfig.get<boolean>('listeners.tasks', true),
        time: extensionRawConfig.get<boolean>('listeners.time', true)
      }
    };
    
    // Check if the log directory is a valid path, if not, set it to the default
    if ( !path.isAbsolute(extensionConfig.logDirectory) ) {
      logger.warn(`Invalid log directory path: ${extensionConfig.logDirectory}, setting to default`);
      updateConfig('logDirectory', defaultLogDir);
      extensionConfig.logDirectory = defaultLogDir;
    }
    try {
      fs.mkdirSync(extensionConfig.logDirectory, { recursive: true });
    } catch (error) {
      logger.error(`Error creating log directory: ${error}, setting to default`);
      updateConfig('logDirectory', defaultLogDir);
      extensionConfig.logDirectory = defaultLogDir;
    }
    return extensionConfig;
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
  export function enableExtension(): void {
    const config = getConfig();
    const enabled = !config.enabled;
    updateConfig('enabled', enabled);

    let enabledString = enabled ? 'enabled' : 'disabled';
    let enabledMessage = `Achievement ${enabledString}!`;
    logger.info(enabledMessage);
    vscode.window.showInformationMessage(enabledMessage);
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
    return getConfig().notifications;
  }

  /**
   * Sets the username
   *
   * @memberof config
   * @function setUsername
   *
   * @param {string} username - The username
   * @returns {void}
   * @throws {Error} - If the username is empty
   */
  export function setUsername(username: string): void {
    username = username.trim();
    if (!username) {
      logger.error('Username cannot be empty');
      throw new Error('username cannot be empty');
    }
    updateConfig('username', username);
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
    return getConfig().username;
  }

  function updateConfig(key : string, value : any) {
    const config = vscode.workspace.getConfiguration('achievements');
    config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  export function isListenerEnabled(listener: keyof Config["listeners"]): boolean {
    const listeners = getConfig().listeners;
  
    if (listener in listeners) {
      return listeners[listener];
    } else {
      logger.warn(`Listener "${listener}" does not exist`);
      return false;
    }
  }

}
