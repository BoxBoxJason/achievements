/**
 * Logger module for achievements
 * @author BoxBoxJason
 * @date 2024-11-13
 */

import { exit } from 'process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export namespace logger {
    // Log levels
    export const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4,
    } as const;

    export const LOG_LEVELS_SLUG = {
        DEBUG: 'DEBUG',
        INFO: 'INFO',
        WARN: 'WARN',
        ERROR: 'ERROR',
        FATAL: 'FATAL',
    } as const;

    // Log levels in order
    const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

    // Default log level is INFO
    let logLevel = 1;

    // File logging settings
    const LOG_FILENAME = 'extension.log';
    let logFilePath = path.join(__dirname, LOG_FILENAME);
    const maxFileSizeBytes = 15 * 1024 * 1024; // 15 MB
    const outputChannel = vscode.window.createOutputChannel('Achievements Logs');

    /**
     * Sets the log level for the logger
     *
     * @memberof logger
     * @function setLogLevel
     *
     * @param level the log level to set
     * @returns void
     */
    export function setLogLevel(level: string) {
        if (logLevels.includes(level)) {
            logLevel = logLevels.indexOf(level.toUpperCase());
        } else {
            warn(`Invalid log level: ${level}, using default log level: INFO`);
        }
    }

    /**
     * Sets the log directory for the logger
     *
     * @memberof logger
     * @function setLogDir
     *
     * @param directory the directory to set
     * @returns void
     */
    export function setLogDir(directory: string) {
        logFilePath = path.join(directory, LOG_FILENAME);
        fs.mkdirSync(directory, { recursive: true });
    }

    /**
     * Logs a debug message (if log level allows)
     *
     * @memberof logger
     * @function debug
     *
     * @param {string} message - The message to log
     * @returns void
     */
    export function debug(message: string) {
        if (logLevel <= LOG_LEVELS.DEBUG) {
            logMessage(LOG_LEVELS_SLUG.DEBUG, message);
        }
    }

    /**
     * Logs an info message (if log level allows)
     *
     * @memberof logger
     * @function info
     *
     * @param {string} message - The message to log
     * @returns void
     */
    export function info(message: string) {
        if (logLevel <= LOG_LEVELS.INFO) {
            logMessage(LOG_LEVELS_SLUG.INFO, message);
        }
    }

    /**
     * Logs a warning message (if log level allows)
     *
     * @memberof logger
     * @function warn
     *
     * @param {string} message - The message to log
     * @returns void
     */
    export function warn(message: string) {
        if (logLevel <= LOG_LEVELS.WARN) {
            logMessage(LOG_LEVELS_SLUG.WARN, message);
        }
    }

    /**
     * Logs an error message (if log level allows)
     *
     * @memberof logger
     * @function error
     *
     * @param {string} message - The message to log
     * @returns void
     */
    export function error(message: string) {
        if (logLevel <= LOG_LEVELS.ERROR) {
            logMessage(LOG_LEVELS_SLUG.ERROR, message);
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Logs a fatal message (if log level allows)
     *
     * @memberof logger
     * @function fatal
     *
     * @param {string} message - The message to log
     * @returns void
     */
    export function fatal(message: string) {
        if (logLevel <= LOG_LEVELS.FATAL) {
            logMessage(LOG_LEVELS_SLUG.FATAL, message);
            vscode.window.showErrorMessage(message);
        }
        exit(1);
    }

    /**
     * Logs a message to the console, file, and output channel
     *
     * @memberof logger
     * @function logMessage
     *
     * @param {string} level - The log level
     * @param {string} message - The message to log
     * @returns void
     */
    function logMessage(level: string, message: string) {
        const timestamp = getFormattedTime();
        const logMessage = `${timestamp}: ${level}: ${message}`;

        // Log to the output channel
        outputChannel.appendLine(logMessage);

        // Log to the console
        console.log(logMessage);

        // Log to file
        logToFile(logMessage);
    }

    /**
     * Logs a message to a file and rotates the log if necessary
     *
     * @memberof logger
     * @function logToFile
     *
     * @param {string} message - The message to log
     * @returns void
     */
    function logToFile(message: string) {

        try {
            // Create the log directory if it doesn't exist
            const logDir = path.dirname(logFilePath);
            fs.mkdirSync(logDir, { recursive: true });
            rotateLogFile();

            // Append the log message to the file
            fs.appendFileSync(logFilePath, message + '\n');
        } catch (error) {
            outputChannel.appendLine(`${LOG_LEVELS_SLUG.ERROR}: Failed to write log to file: ${(error as Error).message}`);
        }
    }

    /**
     * Rotates the log file by renaming it with a timestamp
     *
     * @memberof logger
     * @function rotateLogFile
     *
     * @returns void
     */
    function rotateLogFile() {
        if (!fs.existsSync(logFilePath)) {
            return;
        } else if (!fs.statSync(logFilePath).isFile()) {
            logger.error(`Failed to rotate log file: ${logFilePath} is not a file`);
            return;
        } else if (fs.statSync(logFilePath).size < maxFileSizeBytes) {
            return;
        } else {
            const rotatedLogFilePath = logFilePath.replace(/\.log$/, `_${Date.now()}.log`);
            try {
                fs.renameSync(logFilePath, rotatedLogFilePath);
                info(`Rotated log file to ${rotatedLogFilePath}`);
            } catch (error) {
                logger.error(`Failed to rotate log file: ${(error as Error).message}`);
            }
        }
    }

    /**
     * Returns the current time in a formatted string
     *
     * @memberof logger
     * @function getFormattedTime
     *
     * @returns {string} the formatted time
     */
    function getFormattedTime(): string {
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }
}

export default logger;