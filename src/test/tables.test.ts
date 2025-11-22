import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as path from 'node:path';
import { db_model } from '../database/model/model';
import Progression from '../database/model/tables/Progression';
import Achievement, { StackingAchievementTemplate } from '../database/model/tables/Achievement';
import { DailySession } from '../database/model/tables/DailySession';
import { getMockContext, cleanupMockContext } from './utils';

suite('Tables Test Suite', () => {
    let context: vscode.ExtensionContext;
    let dbPath: string;

    setup(async () => {
        context = getMockContext();
        dbPath = path.join(context.globalStorageUri.fsPath, 'test.sqlite');
        await db_model.activate(context, dbPath);
    });

    teardown(() => {
        db_model.deactivate();
        cleanupMockContext(context);
    });

    test('DailySession: should insert and retrieve', async () => {
        const today = new Date().toISOString().split('T')[0];
        await DailySession.getOrCreate(today, 100);

        const duration = await DailySession.calculateDuration(today, today);
        assert.strictEqual(duration, 100);
    });

    test('Progression: should insert and retrieve', async () => {
        const p = new Progression({
            name: 'test_progression',
            value: 10,
            type: 'number'
        });
        await p.toRow();

        const all = await Progression.fromDB();
        const found = all.find(x => x.name === 'test_progression');
        assert.ok(found);
        assert.strictEqual(found.value, 10);
        assert.strictEqual(found.type, 'number');
    });

    test('Progression: should handle different types', async () => {
        const pString = new Progression({ name: 'p_string', value: 'hello', type: 'string' });
        const pBool = new Progression({ name: 'p_bool', value: true, type: 'boolean' });
        const date = new Date();
        const pDate = new Progression({ name: 'p_date', value: date, type: 'date' });

        await Progression.toDB([pString, pBool, pDate]);

        const all = await Progression.fromDB();

        const foundString = all.find(x => x.name === 'p_string');
        assert.strictEqual(foundString?.value, 'hello');

        const foundBool = all.find(x => x.name === 'p_bool');
        assert.strictEqual(foundBool?.value, true);

        const foundDate = all.find(x => x.name === 'p_date');
        assert.ok(foundDate?.value instanceof Date);
        assert.strictEqual((foundDate?.value as Date).getTime(), date.getTime());
    });

    test('Achievement: should create from template', async () => {
        // Create the progression first
        const p = new Progression({
            name: 'test_progression',
            value: 0,
            type: 'number'
        });
        await p.toRow();

        const template: StackingAchievementTemplate = {
            title: 'Test Achievement %d',
            icon: 'test-icon',
            category: 'test-category',
            group: 'test-group',
            labels: ['test-label'],
            criterias: ['test_progression'],
            criteriasFunctions: [(tier: number) => tier * 10],
            description: 'Test Description',
            minTier: 1,
            maxTier: 3,
            expFunction: (tier: number) => tier * 100,
            hidden: false,
            requires: []
        };

        await Achievement.fromStackingTemplateToDB(template);

        const result = await Achievement.getAchievements({});
        const all = result.achievements;

        const myAchievements = all.filter((x: any) => x.group === 'test-group');
        assert.strictEqual(myAchievements.length, 3);

        const tier1 = myAchievements.find((x: any) => x.tier === 1);
        assert.ok(tier1);
        assert.strictEqual(tier1.title, 'Test Achievement 1');

        // criteria is a dictionary
        assert.strictEqual(tier1.criteria['test_progression'], 10);
    });
});
