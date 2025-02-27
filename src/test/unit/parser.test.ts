import Prism from 'prismjs';
import { describe, expect, it } from 'vitest';

import { Context, getContextAtCursor } from '../../parser';
import { isSingleToken } from '../../token';

describe('getContextAtCursor', () => {
    function expectContext(
        result: Context | null,
        expectedTokens: Prism.TokenStream,
        expectedOffset?: number,
        expectedLineOffset?: number
    ) {
        expect(result).toStrictEqual({
            tokens: expectedTokens,
            offset: expectedOffset || 0,
            lineOffset: expectedLineOffset || 0,
        });
    }

    it('returns null for offset 0', () => {
        const result = getContextAtCursor(['token1', 'token2'], 0);
        expect(result).toBe(null);
    });

    it('returns token at cursor for single token', () => {
        const result = getContextAtCursor('token', 3);
        expectContext(result, 'token');
    });

    it('returns token before cursor for single token', () => {
        const result = getContextAtCursor('token', 5);
        expectContext(result, 'token');
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
        expectContext(result, tokens);
    });

    it('multiple string tokens before cursor', () => {
        const tokens = ['token1', 'token2'];
        const result = getContextAtCursor(tokens, tokens.join('').length);
        expectContext(result, tokens);
    });

    it('returns nested content if inside', () => {
        const backtick = makeToken('punctuation', '`');
        const nested1 = makeToken('type', 'nest1');
        const nested2 = makeToken('type', 'n2');
        const nested = makeToken('nested', [nested1, '__', nested2]);
        const tokens = ['abc', backtick, nested, 'x'];

        // entire string: abc`nest1__n2x
        expect(getContextAtCursor(tokens, 0)).toBe(null);
        expectContext(getContextAtCursor(tokens, 1), tokens);
        expectContext(getContextAtCursor(tokens, 2), tokens);
        expectContext(getContextAtCursor(tokens, 3), tokens);
        expectContext(getContextAtCursor(tokens, 4), tokens);
        expectContext(getContextAtCursor(tokens, 5), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 6), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 7), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 8), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 9), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 10), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 11), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 12), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 13), nested.content, 4, 0);
        expectContext(getContextAtCursor(tokens, 14), tokens);
        expect(getContextAtCursor(tokens, 15)).toBe(null);
    });

    it('returns token with content that includes the cursor', () => {
        const tokenWithContent = makeToken('something', ['part1', 'part2']);

        const result = getContextAtCursor(tokenWithContent, 8);

        expectContext(result, tokenWithContent);
    });

    it('returns string token if cursor inside the string', () => {
        const bracket = makeToken('punctuation', '[');
        const someString = makeToken('string', '"( "');
        const tokens = [bracket, someString];

        expect(getContextAtCursor(tokens, 0)).toBe(null);
        expectContext(getContextAtCursor(tokens, 1), tokens);
        expectContext(getContextAtCursor(tokens, 2), someString, 1, 0); // cursor after opening "
        expectContext(getContextAtCursor(tokens, 3), someString, 1, 0); // cursor after opening "
        expectContext(getContextAtCursor(tokens, 4), someString, 1, 0); // cursor after opening "
        expectContext(getContextAtCursor(tokens, 5), tokens);
        expect(getContextAtCursor(tokens, 6)).toBe(null);
    });

    it('returns null for empty token stream', () => {
        expect(getContextAtCursor([], 0)).toBe(null);
        expect(getContextAtCursor([], 1)).toBe(null);
    });
});

function makeToken(type: string, content: Prism.TokenStream): Prism.Token {
    const token = new Prism.Token(type, content);
    if (isSingleToken(content)) {
        token.length = content.length;
    } else {
        token.length = content
            .map((content) => content.length)
            .reduce((sum, current) => sum + current, 0);
    }
    return token;
}
