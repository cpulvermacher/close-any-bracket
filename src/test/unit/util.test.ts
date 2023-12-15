import { suite, test, assert } from 'vitest';

import { getBracketToInsert, getGrammar } from '../../util';
import { languages } from 'prismjs';

suite('getBracketToInsert', () => {
    test('ignores brackets if not relevant for language', () => {
        assert.strictEqual(getBracketToInsert('(', 1, 'shellscript'), null);
        assert.strictEqual(getBracketToInsert('{', 1, 'shellscript'), null);
        assert.strictEqual(getBracketToInsert('[', 1, 'shellscript'), null);
    });

    test('closes open brackets', () => {
        assert.strictEqual(getBracketToInsert('(', 1, 'javascript'), ')');
        assert.strictEqual(getBracketToInsert('{', 1, 'javascript'), '}');
        assert.strictEqual(getBracketToInsert('[', 1, 'javascript'), ']');
    });

    test('ignores closed brackets', () => {
        assert.strictEqual(getBracketToInsert('([{}])', 0, 'javascript'), null);
    });

    test('ignores mismatched brackets if closed', () => {
        assert.strictEqual(getBracketToInsert('[)]', 3, 'javascript'), ')');
    });

    test('does not close mismatched open brackets', () => {
        assert.strictEqual(getBracketToInsert('[(]', 3, 'javascript'), null);
    });

    test('does not close open brackets within strings', () => {
        assert.strictEqual(getBracketToInsert('"{"', 3, 'javascript'), null);
    });
});


suite('getGrammar', () => {
    test('returns null for unknown language', () => {
        assert.strictEqual(getGrammar(''), null);
    });

    test('maps from VSCode language to grammar', () => {
        assert.strictEqual(getGrammar('javascript'), languages['javascript']);
        assert.strictEqual(getGrammar('javascriptreact'), languages['jsx']);
        assert.strictEqual(getGrammar('typescript'), languages['typescript']);
        assert.strictEqual(getGrammar('typescriptreact'), languages['tsx']);
        assert.strictEqual(getGrammar('objective-c'), languages['objectivec']);
        assert.strictEqual(getGrammar('shellscript'), languages['shell']);
    });
});
