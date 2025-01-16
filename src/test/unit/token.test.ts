import { describe, expect, it } from 'vitest';

import {
    getBracketString,
    getLineCount,
    isSingleToken,
    Token,
} from '../../token';

it('isSingleToken', () => {
    expect(isSingleToken('abc')).toBe(true);
    expect(isSingleToken({ content: [] } as unknown as Token)).toBe(true);

    expect(isSingleToken(['abc'])).toBe(false);
    expect(isSingleToken([{ content: [] } as unknown as Token])).toBe(false);
    expect(isSingleToken({} as Token)).toBe(false);
});

describe('getBracketString', () => {
    it('returns null for non-punctuation token', () => {
        expect(getBracketString('abc')).toBe(null);
        expect(getBracketString({ type: 'abc' } as Token)).toBe(null);
    });

    it('returns null for punctuation token with unexpected content', () => {
        expect(
            getBracketString({
                type: 'punctuation',
                content: 123,
            } as unknown as Token)
        ).toBe(null);
    });

    it('returns null for non-bracket punctuation token', () => {
        expect(
            getBracketString({
                type: 'punctuation',
                content: '!',
            } as Token)
        ).toBe(null);
    });

    it('returns bracket character for bracket punctuation token', () => {
        const characters = '()[]{}';
        for (const character of characters) {
            expect(
                getBracketString({
                    type: 'punctuation',
                    content: character,
                } as Token)
            ).toBe(character);
        }
    });
});

describe('getLineCount', () => {
    it('returns 0 for empty string', () => {
        expect(getLineCount('')).toBe(0);
    });

    it('returns line count for string token', () => {
        expect(getLineCount('abc')).toBe(0);
        expect(getLineCount('ab\nc')).toBe(1);
        expect(getLineCount('ab\n\nc')).toBe(2);
        expect(getLineCount('\n\n\n')).toBe(3);
    });

    it('returns line count for single token', () => {
        expect(getLineCount({ content: 'abc' } as Token)).toBe(0);
        expect(getLineCount({ content: 'ab\nc' } as Token)).toBe(1);
        expect(getLineCount({ content: 'ab\n\nc' } as Token)).toBe(2);
        expect(getLineCount({ content: '\n\n\n' } as Token)).toBe(3);
    });

    it('returns 0 for empty token', () => {
        expect(getLineCount({ content: [] } as unknown as Token)).toBe(0);
    });

    it('returns line count for token with content', () => {
        expect(
            getLineCount({ content: ['abc', '\n\n', 'x\ny\n'] } as Token)
        ).toBe(4);
    });
});
