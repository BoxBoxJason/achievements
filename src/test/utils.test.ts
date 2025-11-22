import * as assert from 'node:assert';
import { parseValue } from '../utils/types';

suite('Utils Test Suite', () => {
    test('parseValue should handle numbers', () => {
        assert.strictEqual(parseValue('123', 'number'), 123);
        assert.strictEqual(parseValue('12.34', 'float'), 12.34);
    });

    test('parseValue should handle booleans', () => {
        assert.strictEqual(parseValue('true', 'boolean'), true);
        assert.strictEqual(parseValue('1', 'boolean'), true);
        assert.strictEqual(parseValue('false', 'boolean'), false);
    });

    test('parseValue should handle dates', () => {
        const d = new Date();
        // Round to seconds to avoid ms precision issues if any
        d.setMilliseconds(0);
        const parsed = parseValue(d.toISOString(), 'date');
        assert.ok(parsed instanceof Date);
        assert.strictEqual(parsed.getTime(), d.getTime());
    });

    test('parseValue should handle json', () => {
        const obj = { a: 1 };
        const parsed = parseValue(JSON.stringify(obj), 'json');
        assert.deepStrictEqual(parsed, obj);
    });
});
