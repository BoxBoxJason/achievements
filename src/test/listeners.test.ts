import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { db_model } from '../database/model/model';
import { fileListeners } from '../listeners/files';
import { gitListeners } from '../listeners/git';
import { timeListeners } from '../listeners/time';
import Progression from '../database/model/tables/Progression';
import { DailySession } from '../database/model/tables/DailySession';
import { getMockContext, cleanupMockContext } from './utils';
import { constants } from '../constants';

suite('Listeners Test Suite', () => {
    let context: vscode.ExtensionContext;
    let dbPath: string;
    let testFileUri: vscode.Uri;

    setup(async () => {
        context = getMockContext();
        dbPath = path.join(context.globalStorageUri.fsPath, 'test.sqlite');
        await db_model.activate(context, dbPath);

        // Create a dummy file
        const testFilePath = path.join(context.globalStorageUri.fsPath, 'test.txt');
        fs.writeFileSync(testFilePath, 'test content');
        testFileUri = vscode.Uri.file(testFilePath);
    });

    teardown(() => {
        db_model.deactivate();
        cleanupMockContext(context);
    });

    test('handleCreateEvent should increase FILES_CREATED progression', async () => {
        await fileListeners.handleCreateEvent(testFileUri);

        const progressions = await Progression.getProgressions({ name: constants.criteria.FILES_CREATED });
        const p = progressions[0];
        assert.ok(p);
        assert.strictEqual(p.value, 1);
    });

    test('handleDeleteEvent should increase RESOURCE_DELETED progression', async () => {
        await fileListeners.handleDeleteEvent(testFileUri);

        const progressions = await Progression.getProgressions({ name: constants.criteria.RESOURCE_DELETED });
        const p = progressions[0];
        assert.ok(p);
        assert.strictEqual(p.value, 1);
    });

    test('handleCommit should increase COMMITS progression', async () => {
        await gitListeners.handleCommit();

        const progressions = await Progression.getProgressions({ name: constants.criteria.COMMITS });
        const p = progressions[0];
        assert.ok(p);
        assert.strictEqual(p.value, 1);
    });

    test('handlePublish should increase PUSHES progression', async () => {
        await gitListeners.handlePublish();

        const progressions = await Progression.getProgressions({ name: constants.criteria.PUSHES });
        const p = progressions[0];
        assert.ok(p);
        assert.strictEqual(p.value, 1);
    });

    test('handleRenameEvent should increase FILES_RENAMED progression', async () => {
        const event: vscode.FileRenameEvent = {
            files: [{ oldUri: testFileUri, newUri: testFileUri }]
        };
        await fileListeners.handleRenameEvent(event);

        const progressions = await Progression.getProgressions({ name: constants.criteria.FILES_RENAMED });
        const p = progressions[0];
        assert.ok(p);
        assert.strictEqual(p.value, 1);
    });

    test('handleTextChangedEvent should increase LINES_OF_CODE progression', async () => {
        // Create a dummy document change event
        // We need to mock the document and content changes
        // This is tricky because vscode types are hard to mock fully.
        // But we can pass an object that looks like it.

        const event = {
            document: {
                fileName: 'test.ts',
                uri: vscode.Uri.file('test.ts'),
                languageId: 'typescript'
            },
            contentChanges: [
                {
                    range: new vscode.Range(0, 0, 0, 0),
                    rangeOffset: 0,
                    rangeLength: 0,
                    text: '\n' // New line
                }
            ]
        } as unknown as vscode.TextDocumentChangeEvent;

        await fileListeners.handleTextChangedEvent(event);

        // Check progression
        // LINES_OF_CODE_LANGUAGE is 'linesOfCodeCount_%s'
        // For .ts, language is 'typescript' (from constants)
        // Let's check constants.labels.LANGUAGES_EXTENSIONS['.ts']

        const progressions = await Progression.getProgressions({ name: 'linesOfCodeCount_typescript' });
        const p = progressions[0];
        assert.ok(p);
        assert.strictEqual(p.value, 1);
    });

    test('handleWindowStateChange should update daily session', async () => {
        // Simulate focus
        await timeListeners.handleWindowStateChange({ focused: true, active: true });

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Simulate blur
        await timeListeners.handleWindowStateChange({ focused: false, active: false });

        const today = new Date().toISOString().split('T')[0];
        const duration = await DailySession.calculateDuration(today, today);
        assert.ok(duration >= 1);
    });
});
