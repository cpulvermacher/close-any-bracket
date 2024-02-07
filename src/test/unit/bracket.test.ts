import { describe, it, expect } from 'vitest';
import Prism, { languages } from 'prismjs';

import { getBracketToInsert, getGrammar, getContextAtCursor, isSingleToken, getIndentationLevelAtLine } from '../../brackets';

describe('getBracketToInsert', () => {
    it('closes open brackets', () => {
        expect(getBracketToInsert('(', 1, 'javascript')).toBe(')');
        expect(getBracketToInsert('{', 1, 'javascript')).toBe('}');
        expect(getBracketToInsert('[', 1, 'javascript')).toBe(']');
    });

    it('inserts nothing at position 0', () => {
        expect(getBracketToInsert('(', 0, 'javascript')).toBe(null);
    });

    it('ignores brackets if not relevant for language', () => {
        expect(getBracketToInsert('{([', 2, 'latex')).toBe('}');
        expect(getBracketToInsert('{([', 3, 'latex')).toBe(']');
    });

    it('ignores closed brackets', () => {
        expect(getBracketToInsert('([{}])', 6, 'javascript')).toBe(null);
    });

    it('may not close mismatched open brackets', () => {
        expect(getBracketToInsert('[(]', 3, 'javascript')).toBe(null);
        expect(getBracketToInsert('[)]', 3, 'javascript')).toBe(null);
    });

    // strings
    it('does not close open brackets within strings', () => {
        expect(getBracketToInsert('"{(["', 2, 'javascript')).toBe(null);
        expect(getBracketToInsert('"{(["', 3, 'javascript')).toBe(null);
        expect(getBracketToInsert('"{(["', 4, 'javascript')).toBe(null);
        expect(getBracketToInsert('"{(["', 5, 'javascript')).toBe(null);
    });

    it('does not close brackets before string if inside string', () => {
        expect(getBracketToInsert('["(   "', 2, 'javascript')).toBe(null);
    });

    it('closes brackets before string ', () => {
        expect(getBracketToInsert('["("', 4, 'javascript')).toBe(']');
    });

    // template strings
    it('does not close open brackets within template strings', () => {
        expect(getBracketToInsert('`{([`', 5, 'javascript')).toBe(null);
    });

    it('closes open brackets within template string interpolation', () => {
        expect(getBracketToInsert('`${`', 3, 'javascript')).toBe('}');
        expect(getBracketToInsert('`${(`', 4, 'javascript')).toBe(')');

    });

    it.skip('does not close open brackets within template string interpolation if cursor outside template string', () => {
        expect(getBracketToInsert('`${`', 4, 'javascript')).toBe(null);
        expect(getBracketToInsert('`${(`', 5, 'javascript')).toBe(null);
    });

    it.skip('closes brackets before template string', () => {
        expect(getBracketToInsert('(`${[}`', 7, 'javascript')).toBe(')');
    });

    // comments
    it('does not close open brackets within comments', () => {
        expect(getBracketToInsert('/*{(["', 5, 'javascript')).toBe(null);
    });

    it.skip('does not close brackets before comment if inside comment', () => {
        expect(getBracketToInsert('[ /*(*/', 4, 'javascript')).toBe(null);
    });

    it('closes brackets before comment ', () => {
        expect(getBracketToInsert('[ /*(*/', 7, 'javascript')).toBe(']');
    });
});

describe('getGrammar', () => {
    it('returns null for unknown language', () => {
        expect(getGrammar('')).toBe(null);
    });

    it('maps from VSCode language to grammar', () => {
        expect(getGrammar('javascript')).toBe(languages['javascript']);
        expect(getGrammar('javascriptreact')).toBe(languages['jsx']);
        expect(getGrammar('typescript')).toBe(languages['typescript']);
        expect(getGrammar('typescriptreact')).toBe(languages['tsx']);
        expect(getGrammar('objective-c')).toBe(languages['objectivec']);
        expect(getGrammar('shellscript')).toBe(languages['shell']);
    });
});

describe('getContextAtCursor', () => {
    it('returns null for offset 0', () => {
        const result = getContextAtCursor(['token1', 'token2'], 0);
        expect(result).toBe(null);
    });

    it('returns token at cursor for single token', () => {
        const result = getContextAtCursor('token', 3);
        expect(result).toEqual('token');
    });

    it('returns token before cursor for single token', () => {
        const result = getContextAtCursor('token', 5);
        expect(result).toEqual('token');
    });

    it('returns null if beyond single token', () => {
        const result = getContextAtCursor('token', 30);
        expect(result).toBe(null);
    });

    it('returns null if beyond tokens', () => {
        const result = getContextAtCursor(['short', 'tokens'], 30); // beyond tokens.length
        expect(result).toBe(null);
    });

    it('returns tokens if inside tokens', () => {
        const tokens = ['short', 'tokens'];
        const result = getContextAtCursor(tokens, 5);
        expect(result).toBe(tokens);
    });

    it('multiple string tokens before cursor', () => {
        const tokens = ['token1', 'token2'];

        const result = getContextAtCursor(tokens, tokens.join('').length);

        expect(result).toEqual(tokens);
    });

    it('returns nested content if inside', () => {
        const backtick = makeToken('punctuation', '`');
        const nested1 = makeToken('type', 'nest1');
        const nested2 = makeToken('type', 'n2');
        const nested = makeToken('nested', [nested1, '__', nested2,]);
        const nestedTokens = ['abc', backtick, nested, 'x'];

        // entire string: abc`nest1__n2x
        expect(getContextAtCursor(nestedTokens, 0)).toEqual(null);
        expect(getContextAtCursor(nestedTokens, 1)).toEqual(nestedTokens);
        expect(getContextAtCursor(nestedTokens, 2)).toEqual(nestedTokens);
        expect(getContextAtCursor(nestedTokens, 3)).toEqual(nestedTokens);
        expect(getContextAtCursor(nestedTokens, 4)).toEqual(nestedTokens);
        expect(getContextAtCursor(nestedTokens, 5)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 6)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 7)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 8)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 9)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 10)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 11)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 12)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 13)).toEqual(nested.content);
        expect(getContextAtCursor(nestedTokens, 14)).toEqual(nestedTokens);
        expect(getContextAtCursor(nestedTokens, 15)).toEqual(null);
    });

    it('returns token with content that includes the cursor', () => {
        const tokenWithContent = makeToken('something', ['part1', 'part2']);

        const result = getContextAtCursor(tokenWithContent, 8);

        expect(result).toEqual(tokenWithContent);
    });

    it('returns string token if cursor inside the string', () => {
        const bracket = makeToken('punctuation', '[');
        const someString = makeToken('string', '"( "');
        const tokens = [bracket, someString];

        expect(getContextAtCursor(tokens, 0)).toEqual(null);
        expect(getContextAtCursor(tokens, 1)).toEqual(tokens);
        expect(getContextAtCursor(tokens, 2)).toEqual(someString); // cursor after opening "
        expect(getContextAtCursor(tokens, 3)).toEqual(someString);
        expect(getContextAtCursor(tokens, 4)).toEqual(someString);
        expect(getContextAtCursor(tokens, 5)).toEqual(tokens); // cursor after closing "
        expect(getContextAtCursor(tokens, 6)).toEqual(null);
    });

    it('returns string token if cursor inside the string (single character string)', () => {
        const bracket = makeToken('punctuation', '[');
        const someString = makeToken('string', '"');
        const tokens = [bracket, someString];

        expect(getContextAtCursor(tokens, 0)).toEqual(null);
        expect(getContextAtCursor(tokens, 1)).toEqual(tokens);
        expect(getContextAtCursor(tokens, 2)).toEqual(someString); // cursor after opening "
        expect(getContextAtCursor(tokens, 3)).toEqual(null);
    });


    it('returns null for empty token stream', () => {
        expect(getContextAtCursor([], 0)).toBe(null);
        expect(getContextAtCursor([], 1)).toBe(null);
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

function makeToken(type: string, content: Prism.TokenStream): Prism.Token {
    const token = new Prism.Token(type, content);
    if (isSingleToken(content)) {
        token.length = content.length;
    } else {
        token.length = content
            .map(content => content.length)
            .reduce((sum, current) => sum + current, 0);
    }
    return token;
}
