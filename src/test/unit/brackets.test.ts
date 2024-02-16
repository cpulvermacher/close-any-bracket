import { describe, it, expect } from 'vitest';

import {
    closeBracket,
    closeToIndentAtLine,
    getIndentationLevelAtLine,
} from '../../brackets';
import { closeToIndentExamples } from './close_to_indent_examples';

describe('closeBracket', () => {
    it('closes open brackets', () => {
        expect(closeBracket('(', 1, 'javascript')).toBe(')');
        expect(closeBracket('{', 1, 'javascript')).toBe('}');
        expect(closeBracket('[', 1, 'javascript')).toBe(']');
    });

    it('inserts nothing at position 0', () => {
        expect(closeBracket('(', 0, 'javascript')).toBe(null);
    });

    it('ignores brackets if not relevant for language', () => {
        expect(closeBracket('{([', 2, 'latex')).toBe('}');
        expect(closeBracket('{([', 3, 'latex')).toBe(']');
    });

    it('ignores closed brackets', () => {
        expect(closeBracket('([{}])', 6, 'javascript')).toBe(null);
    });

    it('may not close mismatched open brackets', () => {
        expect(closeBracket('[(]', 3, 'javascript')).toBe(null);
        expect(closeBracket('[)]', 3, 'javascript')).toBe(null);
    });

    // strings
    it('does not close open brackets within strings', () => {
        expect(closeBracket('"{(["', 2, 'javascript')).toBe(null);
        expect(closeBracket('"{(["', 3, 'javascript')).toBe(null);
        expect(closeBracket('"{(["', 4, 'javascript')).toBe(null);
        expect(closeBracket('"{(["', 5, 'javascript')).toBe(null);
    });

    it('does not close brackets before string if inside string', () => {
        expect(closeBracket('["(   "', 2, 'javascript')).toBe(null);
    });

    it('closes brackets before string ', () => {
        expect(closeBracket('["("', 4, 'javascript')).toBe(']');
    });

    // template strings
    it('does not close open brackets within template strings', () => {
        expect(closeBracket('`{([`', 5, 'javascript')).toBe(null);
    });

    it('closes open brackets within template string interpolation', () => {
        expect(closeBracket('`${`', 3, 'javascript')).toBe('}');
        expect(closeBracket('`${(`', 4, 'javascript')).toBe(')');
    });

    it.skip('does not close open brackets within template string interpolation if cursor outside template string', () => {
        expect(closeBracket('`${`', 4, 'javascript')).toBe(null);
        expect(closeBracket('`${(`', 5, 'javascript')).toBe(null);
    });

    it.skip('closes brackets before template string', () => {
        expect(closeBracket('(`${[}`', 7, 'javascript')).toBe(')');
    });

    // comments
    it('does not close open brackets within comments', () => {
        expect(closeBracket('/*{(["', 5, 'javascript')).toBe(null);
    });

    it.skip('does not close brackets before comment if inside comment', () => {
        expect(closeBracket('[ /*(*/', 4, 'javascript')).toBe(null);
    });

    it('closes brackets before comment ', () => {
        expect(closeBracket('[ /*(*/', 7, 'javascript')).toBe(']');
    });
});

describe('closeToIndentAtLine', () => {
    function closeToIndent(text: string, cursorOffset: number, languageId) {
        const lines = text.split('\n');
        const lineNoAtCursor =
            text.substring(0, cursorOffset).split('\n').length - 1;
        const getLine = (line: number) => lines[line];

        return closeToIndentAtLine(
            text,
            cursorOffset,
            languageId,
            lineNoAtCursor,
            getLine
        );
    }

    it('returns empty string if no brackets to close', () => {
        expect(closeToIndent('{[(', 0, 'javascript')).toBe('');
    });

    it('closes brackets in current line', () => {
        expect(closeToIndent('{[(', 1, 'javascript')).toBe('}');
        expect(closeToIndent('{[(', 2, 'javascript')).toBe(']}');
        expect(closeToIndent('{[(', 3, 'javascript')).toBe(')]}');
    });

    function checkAllExpectsInMultilineString(
        testString: string,
        language: string
    ) {
        // for every line that contains "// expect: $STRING",
        // verify that calling closeToIndentAtLine at the line (cursor at beginning of line)
        // returns $STRING
        const lines = testString.split('\n');
        const getLine = (line: number) => lines[line];

        const expectRegex = /expect: ?(\S*)/;
        let numExpects = 0;
        let offsetBeginningOfLine = 0;
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(expectRegex);
            if (match) {
                numExpects++;
                const expectedBrackets = match[1];
                const result = closeToIndentAtLine(
                    testString,
                    offsetBeginningOfLine,
                    language,
                    i,
                    getLine
                );

                expect(result, `failure in line ${i}: ${lines[i]}`).toBe(
                    expectedBrackets
                );
            }

            offsetBeginningOfLine += lines[i].length + 1;
        }

        expect(numExpects, 'At least one expect required!').toBeGreaterThan(0);
    }

    closeToIndentExamples.forEach((entry) => {
        it(`closes to indent: ${entry.language} `, () => {
            checkAllExpectsInMultilineString(entry.code, entry.language);
        });
    });
});

describe('getIndentationLevelAtLine', () => {
    it('returns 0 for empty line', () => {
        expect(getIndentationLevelAtLine(0, () => '')).toBe(0);
        expect(getIndentationLevelAtLine(1, () => '')).toBe(0);
    });

    it('returns indent for line with only whitespace', () => {
        expect(getIndentationLevelAtLine(0, () => '   ')).toBe(3);
    });

    it('returns 1 for line with one space indent', () => {
        expect(getIndentationLevelAtLine(0, () => ' abc')).toBe(1);
    });

    it('returns 4 for line with one tab indent', () => {
        expect(getIndentationLevelAtLine(0, () => '\tabc')).toBe(4);
    });
});