import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as path from 'node:path';
import { db_model } from '../database/model/model';
import { db_init } from '../database/model/init/init';
import { TimeSpentController } from '../database/controller/timespent';
import { DailySession } from '../database/model/tables/DailySession';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';
import { getMockContext, cleanupMockContext } from './utils';

suite('Connection Streak Test Suite', () => {
    let context: vscode.ExtensionContext;
    let dbPath: string;
    let originalDate: any;

    setup(async () => {
        context = getMockContext();
        dbPath = path.join(context.globalStorageUri.fsPath, 'achievements.sqlite');
        await db_model.activate(context, dbPath);
        await db_init.activate(); // Initialize progressions
        originalDate = global.Date;
    });

    teardown(() => {
        db_model.deactivate();
        cleanupMockContext(context);
        global.Date = originalDate;
    });

    function mockDate(isoDate: string) {
        const date = new originalDate(isoDate);
        global.Date = class extends originalDate {
            constructor(args: any) {
                super(args);
                if (args) {
                    return new originalDate(args);
                }
                return date;
            }
            static now() {
                return date.getTime();
            }

            // Need to override other methods if used, but new Date() is the main one
            // Also need to handle new Date(string) which is used in the code
            // The constructor above handles it?
            // Wait, `new Date()` calls constructor with no args.
            // `new Date(currentDate)` calls constructor with args.
        } as any;
    }

    test('1 day connected is counted', async () => {
        mockDate('2023-01-01T12:00:00Z');

        // Create session for today
        const session = await DailySession.getOrCreate('2023-01-01');
        await session.increase(100);

        await TimeSpentController.updateConnectionStreak();

        const progs = await ProgressionController.getProgressions();
        assert.strictEqual(progs[constants.criteria.CURRENT_CONNECTION_STREAK], 1);
        assert.strictEqual(progs[constants.criteria.MAX_CONNECTION_STREAK], 1);
    });

    test('Consecutive days increment streak', async () => {
        // Day 1
        mockDate('2023-01-01T12:00:00Z');
        let session = await DailySession.getOrCreate('2023-01-01');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        // Day 2
        mockDate('2023-01-02T12:00:00Z');
        session = await DailySession.getOrCreate('2023-01-02');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        let progs = await ProgressionController.getProgressions();
        assert.strictEqual(progs[constants.criteria.CURRENT_CONNECTION_STREAK], 2);

        // Day 3
        mockDate('2023-01-03T12:00:00Z');
        session = await DailySession.getOrCreate('2023-01-03');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        progs = await ProgressionController.getProgressions();
        assert.strictEqual(progs[constants.criteria.CURRENT_CONNECTION_STREAK], 3);
    });

    test('Streak reset on missed day', async () => {
        // Day 1
        mockDate('2023-01-01T12:00:00Z');
        let session = await DailySession.getOrCreate('2023-01-01');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        // Skip Day 2

        // Day 3
        mockDate('2023-01-03T12:00:00Z');
        session = await DailySession.getOrCreate('2023-01-03');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        const progs = await ProgressionController.getProgressions();
        assert.strictEqual(progs[constants.criteria.CURRENT_CONNECTION_STREAK], 1);
        assert.strictEqual(progs[constants.criteria.MAX_CONNECTION_STREAK], 1); // Max was 1
    });

    test('Max streak updates', async () => {
         // Day 1
        mockDate('2023-01-01T12:00:00Z');
        let session = await DailySession.getOrCreate('2023-01-01');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        // Day 2
        mockDate('2023-01-02T12:00:00Z');
        session = await DailySession.getOrCreate('2023-01-02');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        let progs = await ProgressionController.getProgressions();
        assert.strictEqual(progs[constants.criteria.MAX_CONNECTION_STREAK], 2);

        // Reset
        mockDate('2023-01-04T12:00:00Z');
        session = await DailySession.getOrCreate('2023-01-04');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        progs = await ProgressionController.getProgressions();
        assert.strictEqual(progs[constants.criteria.CURRENT_CONNECTION_STREAK], 1);
        assert.strictEqual(progs[constants.criteria.MAX_CONNECTION_STREAK], 2);
    });

    test('Idempotency within same day', async () => {
        mockDate('2023-01-01T12:00:00Z');

        // First update
        let session = await DailySession.getOrCreate('2023-01-01');
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        let progs = await ProgressionController.getProgressions();
        assert.strictEqual(progs[constants.criteria.CURRENT_CONNECTION_STREAK], 1);

        // Second update same day
        await session.increase(100);
        await TimeSpentController.updateConnectionStreak();

        progs = await ProgressionController.getProgressions();
        assert.strictEqual(progs[constants.criteria.CURRENT_CONNECTION_STREAK], 1);
    });
});
