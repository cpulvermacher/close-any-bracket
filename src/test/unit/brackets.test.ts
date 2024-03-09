import { describe, expect, it } from 'vitest';

import {
    closeBracket,
    closeToIndentAtLine,
    getIndentationLevelAtLine,
} from '../../brackets';
import { closeToIndentExamples } from './close_to_indent_examples';

const javascriptWithUnclosedBracketsInMiddle = `
describe('a', () => {
    it('b', () => {
    // here
});
`;

describe('closeBracket', () => {
    const options = { ignoreAlreadyClosed: false };
    const optionsWithIgnoreClosed = { ignoreAlreadyClosed: true };

    it('closes open brackets', () => {
        expect(closeBracket('(', 1, 'javascript', options)).toBe(')');
        expect(closeBracket('{', 1, 'javascript', options)).toBe('}');
        expect(closeBracket('[', 1, 'javascript', options)).toBe(']');
        expect(closeBracket('(', 1, 'makefile', options)).toBe(')');
        expect(closeBracket('{', 1, 'makefile', options)).toBe('}');
    });

    it('inserts nothing at position 0', () => {
        expect(closeBracket('(', 0, 'javascript', options)).toBe(null);
    });

    it('ignores brackets if not relevant for language', () => {
        expect(closeBracket('{([', 2, 'latex', options)).toBe('}');
        expect(closeBracket('{([', 3, 'latex', options)).toBe(']');
        expect(closeBracket('[', 1, 'makefile', options)).toBe(null);
    });

    it('ignores closed brackets', () => {
        expect(closeBracket('([{}])', 6, 'javascript', options)).toBe(null);
    });

    it('ignores brackets closed after cursor', () => {
        const options = { ignoreAlreadyClosed: true };

        expect(closeBracket('([{}])', 0, 'javascript', options)).toBe(null);
        expect(closeBracket('([{}])', 1, 'javascript', options)).toBe(null);
        expect(closeBracket('([{}])', 2, 'javascript', options)).toBe(null);
        expect(closeBracket('([{}])', 3, 'javascript', options)).toBe(null);
        expect(closeBracket('([{}])', 4, 'javascript', options)).toBe(null);
        expect(closeBracket('([{}])', 5, 'javascript', options)).toBe(null);
        expect(closeBracket('([{}])', 6, 'javascript', options)).toBe(null);
    });

    it('only takes closed brackets up to cursor into account', () => {
        const options = { ignoreAlreadyClosed: false };

        expect(closeBracket('([{}])', 0, 'javascript', options)).toBe(null);
        expect(closeBracket('([{}])', 1, 'javascript', options)).toBe(')');
        expect(closeBracket('([{}])', 2, 'javascript', options)).toBe(']');
        expect(closeBracket('([{}])', 3, 'javascript', options)).toBe('}');
        expect(closeBracket('([{}])', 4, 'javascript', options)).toBe(']');
        expect(closeBracket('([{}])', 5, 'javascript', options)).toBe(')');
        expect(closeBracket('([{}])', 6, 'javascript', options)).toBe(null);
    });

    it('handles mismatched brackets', () => {
        //cursor before mismatched bracket
        expect(
            closeBracket('({ ({} })', 6, 'javascript', optionsWithIgnoreClosed)
        ).toBe(')');
        expect(
            closeBracket('({ ({} })', 7, 'javascript', optionsWithIgnoreClosed)
        ).toBe(')');

        //cursor after mismatched bracket
        expect(() =>
            closeBracket('({ ({} })', 8, 'javascript', optionsWithIgnoreClosed)
        ).toThrow();
        expect(() =>
            closeBracket('({ ({} })', 9, 'javascript', optionsWithIgnoreClosed)
        ).toThrow();
    });

    it('closes brackets missing brackets in the middle', () => {
        const missingBracket = closeBracket(
            javascriptWithUnclosedBracketsInMiddle,
            javascriptWithUnclosedBracketsInMiddle.indexOf('// here'),
            'javascript',
            optionsWithIgnoreClosed
        );
        expect(missingBracket).toBe('}');
    });

    // strings
    it('does not close open brackets within strings', () => {
        expect(closeBracket('"{(["', 2, 'javascript', options)).toBe(null);
        expect(closeBracket('"{(["', 3, 'javascript', options)).toBe(null);
        expect(closeBracket('"{(["', 4, 'javascript', options)).toBe(null);
        expect(closeBracket('"{(["', 5, 'javascript', options)).toBe(null);
    });

    it('does not close brackets before string if inside string', () => {
        expect(closeBracket('["("', 1, 'javascript', options)).toBe(']'); //before "
        expect(closeBracket('["("', 2, 'javascript', options)).toBe(null);
        expect(closeBracket('["("', 3, 'javascript', options)).toBe(null);
        expect(closeBracket('["("', 4, 'javascript', options)).toBe(']'); //after "

        expect(closeBracket("['('", 1, 'javascript', options)).toBe(']'); //before '
        expect(closeBracket("['('", 2, 'javascript', options)).toBe(null);
        expect(closeBracket("['('", 3, 'javascript', options)).toBe(null);
        expect(closeBracket("['('", 4, 'javascript', options)).toBe(']'); //after '
    });

    // template strings
    it('does not close open brackets within template strings', () => {
        expect(closeBracket('`{([`', 5, 'javascript', options)).toBe(null);
    });

    it('closes open brackets within template string interpolation', () => {
        expect(closeBracket('`${`', 3, 'javascript', options)).toBe('}');
        expect(closeBracket('`${(`', 4, 'javascript', options)).toBe(')');
    });

    //Note: sadly this doesn't work because while brackets are unclosed, the parser doesn't recognize the template string
    it.skip('does not close open brackets within template string interpolation if cursor outside template string', () => {
        expect(closeBracket('`${`', 4, 'javascript', options)).toBe(null);
        expect(closeBracket('`${(`', 5, 'javascript', options)).toBe(null);
    });

    it.skip('closes brackets before template string', () => {
        expect(closeBracket('(`${[}`', 7, 'javascript', options)).toBe(')');
    });

    // comments
    it('does not close open brackets within comments', () => {
        expect(closeBracket('/*{(["', 5, 'javascript', options)).toBe(null);
        expect(closeBracket('//([{', 5, 'javascript', options)).toBe(null);
        expect(closeBracket('#([{', 4, 'makefile', options)).toBe(null);
    });

    it('does not close brackets before comment if inside comment', () => {
        expect(closeBracket('([{ /* */', 5, 'javascript', options)).toBe(null);
        expect(closeBracket('([{ /* */', 6, 'javascript', options)).toBe(null);
        expect(closeBracket('([{ /* */', 7, 'javascript', options)).toBe(null);

        expect(closeBracket('([{ // ', 6, 'javascript', options)).toBe(null);
    });

    it('does not close brackets before comment at end of comment (multi-line comment)', () => {
        expect(closeBracket('([{ /* */', 8, 'javascript', options)).toBe(null);
    });

    it.skip('does not close brackets before comment at end of comment (single-line comment)', () => {
        expect(closeBracket('([{ // ', 7, 'javascript', options)).toBe(null);
    });

    it('closes brackets before comment ', () => {
        expect(closeBracket('[ /*(*/', 7, 'javascript', options)).toBe(']');
        expect(closeBracket('[ // \n', 6, 'javascript', options)).toBe(']');
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
            getLine,
            { ignoreAlreadyClosed: false }
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
        example: string,
        language: string,
        untilCursor: boolean
    ) {
        // for every line that contains "// expect: $STRING",
        // verify that calling closeToIndentAtLine at the line (cursor at beginning of line)
        // returns $STRING
        const lines = example.split('\n');
        const getLine = (line: number) => lines[line];

        const expectRegex = /expect: ?(\S*)/;
        let numExpects = 0;
        let offsetBeginningOfLine = 0;
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(expectRegex);
            if (match) {
                numExpects++;
                const code = !untilCursor
                    ? lines.slice(0, i + 1).join('\n')
                    : example;
                const expectedBrackets = match[1];
                const result = closeToIndentAtLine(
                    code,
                    offsetBeginningOfLine,
                    language,
                    i,
                    getLine,
                    { ignoreAlreadyClosed: !untilCursor }
                );

                expect(result, `failure in last line of: ${code}`).toBe(
                    expectedBrackets
                );
            }

            offsetBeginningOfLine += lines[i].length + 1;
        }

        expect(numExpects, 'At least one expect required!').toBeGreaterThan(0);
    }

    closeToIndentExamples.forEach((entry) => {
        it(`closes to indent: ${entry.language} `, () => {
            // for these tests, ignore all brackets after cursor
            checkAllExpectsInMultilineString(entry.code, entry.language, true);

            // but check that the default behaviour (brackets closed after cursor won't be closed again)
            // as well by truncating the example code
            // The 'html' example contains embedded javascript, but this is not detected until the
            // closing </script> tag, so this doesn't work so well.
            if (entry.language !== 'html') {
                checkAllExpectsInMultilineString(
                    entry.code,
                    entry.language,
                    false
                );
            }
        });
    });

    it('closes missing brackets in the middle', () => {
        const options = { ignoreAlreadyClosed: true };
        const cursorOffset =
            javascriptWithUnclosedBracketsInMiddle.indexOf('// here');
        const lines = javascriptWithUnclosedBracketsInMiddle.split('\n');
        const lineNoAtCursor =
            javascriptWithUnclosedBracketsInMiddle
                .substring(0, cursorOffset)
                .split('\n').length - 1;
        const getLine = (line: number) => lines[line];

        const missingBrackets = closeToIndentAtLine(
            javascriptWithUnclosedBracketsInMiddle,
            cursorOffset,
            'javascript',
            lineNoAtCursor,
            getLine,
            options
        );
        expect(missingBrackets).toBe('})');
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
