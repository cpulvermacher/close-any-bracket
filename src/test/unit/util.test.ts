import { describe, it, expect } from 'vitest';
import Prism, { languages } from 'prismjs';

import { getBracketToInsert, getGrammar, getTokenBeforeOffset, isSingleToken } from '../../util';

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

    it.skip('does not close brackets before string if inside string', () => {
        expect(getBracketToInsert('["("', 2, 'javascript')).toBe(null);
    });

    it('closes brackets before string ', () => {
        expect(getBracketToInsert('["("', 3, 'javascript')).toBe(']');
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

describe('getTokenBeforeOffset', () => {
    it('returns null for offset 0', () => {
        const result = getTokenBeforeOffset(['token1', 'token2'], 0);
        expect(result).toBe(null);
    });

    it('returns token at cursor for single token', () => {
        const result = getTokenBeforeOffset('token', 3);
        expect(result).toEqual(['token']);
    });

    it('returns token before cursor for single token', () => {
        const result = getTokenBeforeOffset('token', 5);
        expect(result).toEqual(['token']);
    });

    it('returns null if beyond single token', () => {
        const result = getTokenBeforeOffset('token', 30);
        expect(result).toBe(null);
    });

    it('returns null if beyond tokens', () => {
        const result = getTokenBeforeOffset(['short', 'tokens'], 30); // beyond tokens.length
        expect(result).toBe(null);
    });

    it('multiple string tokens before cursor', () => {
        const tokens = ['token1', 'token2'];

        const result = getTokenBeforeOffset(tokens, tokens.join('').length);

        expect(result).toEqual(['token2']);
    });

    it('returns nested content if inside', () => {
        const backtick = makeToken('punctuation', '`');
        const nested1 = makeToken('type', 'nest1');
        const nested2 = makeToken('type', 'n2');
        const nested = makeToken('nested', [nested1, '__', nested2,]);
        const nestedTokens = ['abc', backtick, nested, 'x'];

        // entire string: abc`nest1__n2x
        expect(getTokenBeforeOffset(nestedTokens, 1)).toEqual(['abc']);
        expect(getTokenBeforeOffset(nestedTokens, 2)).toEqual(['abc']);
        expect(getTokenBeforeOffset(nestedTokens, 3)).toEqual(['abc']);
        expect(getTokenBeforeOffset(nestedTokens, 4)).toEqual([backtick]);
        expect(getTokenBeforeOffset(nestedTokens, 5)).toEqual([nested, nested1]);
        expect(getTokenBeforeOffset(nestedTokens, 6)).toEqual([nested, nested1]);
        expect(getTokenBeforeOffset(nestedTokens, 7)).toEqual([nested, nested1]);
        expect(getTokenBeforeOffset(nestedTokens, 8)).toEqual([nested, nested1]);
        expect(getTokenBeforeOffset(nestedTokens, 9)).toEqual([nested, nested1]);
        expect(getTokenBeforeOffset(nestedTokens, 10)).toEqual([nested, '__']);
        expect(getTokenBeforeOffset(nestedTokens, 11)).toEqual([nested, '__']);
        expect(getTokenBeforeOffset(nestedTokens, 12)).toEqual([nested, nested2]);
        expect(getTokenBeforeOffset(nestedTokens, 13)).toEqual([nested, nested2]);
        expect(getTokenBeforeOffset(nestedTokens, 14)).toEqual(['x']);
        expect(getTokenBeforeOffset(nestedTokens, 15)).toEqual(null);
    });

    it('returns token with content that includes the cursor', () => {
        const tokenWithContent = makeToken('something', ['part1', 'part2']);

        const result = getTokenBeforeOffset(tokenWithContent, 8);

        expect(result).toEqual([tokenWithContent]);
    });

    it('returns null for empty token stream', () => {
        expect(getTokenBeforeOffset([], 0)).toBe(null);
        expect(getTokenBeforeOffset([], 1)).toBe(null);
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
