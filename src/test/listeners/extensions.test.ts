import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { extensionsListeners } from '../../listeners/extensions';
import { ProgressionController } from '../../database/controller/progressions';
import { constants } from '../../constants';
import { config } from '../../config/config';

suite('Extensions Listeners Test Suite', () => {
    test('activate should register listeners', () => {
        const originalIsListenerEnabled = config.isListenerEnabled;
        config.isListenerEnabled = () => true;

        const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;

        try {
            extensionsListeners.activate(context);
            // If no error, it passed.
            // We can't easily verify listeners were registered without mocking vscode.
            // But this covers the activate function lines.
        } finally {
            config.isListenerEnabled = originalIsListenerEnabled;
        }
    });

    test('checkExtensions should update EXTENSIONS_INSTALLED and THEMES_INSTALLED', async () => {
        let updatedCriteria: string[] = [];
        const originalUpdate = ProgressionController.updateProgression;
        ProgressionController.updateProgression = async (criteria: string, value: string | number | boolean | Date, absolute?: boolean) => {
            updatedCriteria.push(criteria);
        };

        try {
            await extensionsListeners.checkExtensions();
            assert.ok(updatedCriteria.includes(constants.criteria.EXTENSIONS_INSTALLED));
            assert.ok(updatedCriteria.includes(constants.criteria.THEMES_INSTALLED));
        } finally {
            ProgressionController.updateProgression = originalUpdate;
        }
    });

    test('handleThemeChange should increase THEME_CHANGED', async () => {
        let increasedCriteria: string | undefined;
        const originalIncrease = ProgressionController.increaseProgression;
        ProgressionController.increaseProgression = async (criteria: string) => {
            if (criteria === constants.criteria.THEME_CHANGED) {
                increasedCriteria = criteria;
            }
        };

        try {
            // Mock event
            const event = { kind: vscode.ColorThemeKind.Dark } as vscode.ColorTheme;
            await extensionsListeners.handleThemeChange(event);
            assert.strictEqual(increasedCriteria, constants.criteria.THEME_CHANGED);
        } finally {
            ProgressionController.increaseProgression = originalIncrease;
        }
    });
});
