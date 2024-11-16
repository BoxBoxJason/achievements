// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { db_model } from './database/model/model';
import logger from './logger/logger';
import { config } from './config/config';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// ==================== CONFIG ====================
	config.activate(context);
	let configuration = config.getConfig();

	// ==================== LOGGER ====================
	logger.setLogDir(configuration.logDirectory);
	logger.setLogLevel(configuration.logLevel);

	// ==================== DATABASE ====================
	if (configuration.enabled) {
		db_model.activate(context);
	}

	// ==================== COMMANDS ====================
	// Warning, do not forget to add each command to the package.json file AND to the subscriptions array

	// Enable command
	const enable_command = vscode.commands.registerCommand('achievements.enable', () => {
		config.enableExtension();

	});
	context.subscriptions.push(enable_command);

	// Disable command
	const disable_command = vscode.commands.registerCommand('achievements.disable', () => {
		config.enableExtension(false);
		logger.info('Achievement disabled!');
	});
	context.subscriptions.push(disable_command);

	// Configuration command
	const configuration_command = vscode.commands.registerCommand('achievements.configuration', () => {
		config.openConfiguration();
	});
	context.subscriptions.push(configuration_command);

	// Show achievements command
	const show_achievements_command = vscode.commands.registerCommand('achievements.show', () => {
		logger.error('Not implemented yet');
	});
	context.subscriptions.push(show_achievements_command);
}

// This method is called when your extension is deactivated
export function deactivate() {
	db_model.deactivate();
}
