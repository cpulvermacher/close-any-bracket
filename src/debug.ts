// Debug helper functions
import type Prism from 'prismjs';
import { isSingleToken, Token } from './token';

export function formatToken(token: Token): string {
    if (typeof token === 'string') {
        return `"${token}"`;
    }

    if (isSingleToken(token.content)) {
        return `"${formatToken(token.content)}"`;
    }

    return token.type;
}

/** converts parsed `tokens` back into a string */
export function printTokenStream(tokens: Prism.TokenStream): string {
    if (typeof tokens === 'string') {
        return tokens;
    }
    if (isSingleToken(tokens)) {
        return printTokenStream(tokens.content);
    }

    let result = '';
    for (const token of tokens) {
        result += printTokenStream(token);
    }
    return result;
}

/** marks the given offsets in the input text with `>><<` */
export function printCursorOffsets(
    text: string,
    cursorOffsets: number[]
): string {
    cursorOffsets.sort((a, b) => a - b);
    let result = '';
    let currentOffset = 0;
    for (const offset of cursorOffsets) {
        result += text.substring(currentOffset, offset);
        result += '>><<';
        currentOffset = offset;
    }
    result += text.substring(currentOffset);
    return result;
}
