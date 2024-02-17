import Prism from 'prismjs';
Prism.manual = true; //disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)
import loadLanguages from 'prismjs/components/index';

import { formatToken } from './debug';

export const BRACKET_CHARACTERS = new Set(['(', ')', '{', '}', '[', ']']);

export type ClosingBracket = {
    bracket: ')' | ']' | '}';
    openedAtLine: number;
};

export type Token =
    | string
    | Prism.Token; /** returns either a opening/closing bracket character if the token represents one, or null. */

/**
 * Parses the given text to find missing closing brackets at the specified cursor offset.
 *
 * @param text text to parse
 * @param cursorOffset offset of the cursor within the text
 * @param languageId VSCode language identifier for text
 * @returns array of missing closing brackets, or null if none found
 */
export function parse(
    text: string,
    cursorOffset: number,
    languageId: string
): ClosingBracket[] | null {
    const grammar = getGrammar(languageId);
    if (!grammar) {
        console.log(`Couldn't find grammar for language ${languageId}`);
        return null;
    }

    const allTokens = Prism.tokenize(text, grammar);
    console.debug('Tokenized input file:', allTokens);

    const context = getContextAtCursor(allTokens, cursorOffset);
    if (context.tokens === null) {
        return null;
    }

    const missing = getMissingBrackets(
        context.tokens,
        cursorOffset - context.offset,
        context.lineOffset
    );
    if (!missing || missing.length === 0) {
        return null;
    }
    return missing;
}

/**
 * Maps VSCode language identifiers (https://code.visualstudio.com/docs/languages/identifiers)
 * to Grammar (https://prismjs.com/#supported-languages) or null if not found
 */
export function getGrammar(languageId: string): Prism.Grammar | null {
    let grammarId: string;
    switch (languageId) {
        case 'javascriptreact':
            grammarId = 'jsx';
            break;
        case 'jsonc': // JSON with comments
            grammarId = 'json';
            break;
        case 'typescriptreact':
            grammarId = 'tsx';
            break;
        case 'objective-c':
            grammarId = 'objectivec';
            break;
        case 'shellscript':
            grammarId = 'shell';
            break;
        default:
            grammarId = languageId;
            break;
    }

    if (!(grammarId in Prism.languages)) {
        console.log(`Trying to load grammar for ${grammarId}...`);
        loadLanguages(grammarId);
    }

    return Prism.languages[grammarId] || null;
}

export function isSingleToken(token: Prism.TokenStream): token is Token {
    return typeof token === 'string' || 'content' in token;
}

export type Context = {
    tokens: Prism.TokenStream | null;
    offset: number; // offset of the context from the beginning of the input tokens
    lineOffset: number; // number of lines skipped before the start of the context
};

/** Returns the token or list of tokens that is relevant for the current cursor position.
 *
 * Might return a single token if we are a inside string, the entire file if
 * we get only one (top-level) token, or something in between.
 *
 * Note that a cursor offset of x represents a position _before_ x! E.g. for
 * offset = 0, there are no tokens before 0, so this returns `null`.
 */
export function getContextAtCursor(
    tokens: Prism.TokenStream,
    cursorOffset: number
): Context {
    if (cursorOffset <= 0) {
        return { tokens: null, offset: 0, lineOffset: 0 };
    }

    if (isSingleToken(tokens)) {
        return {
            tokens: cursorOffset <= tokens.length ? tokens : null,
            offset: 0,
            lineOffset: 0,
        };
    }

    let currentOffset = 0;
    let lineNo = 0;
    for (const token of tokens) {
        //note: case for token starts after cursor cannot happen (cursorOffset > 0)
        if (currentOffset + token.length < cursorOffset) {
            // token ends before cursorOffset - 1, skip
            currentOffset += token.length;
            lineNo += getLineCount(token);
        } else if (typeof token !== 'string' && token.type === 'string') {
            // if cursor is on the last char of the token and it's a quote, the cursor is not inside the string anymore
            const tokenStr =
                typeof token === 'string' ? token : (token.content as string);
            if (
                token.length > 1 &&
                currentOffset + token.length === cursorOffset &&
                tokenStr[0] === tokenStr[token.length - 1]
            ) {
                return { tokens, offset: 0, lineOffset: 0 };
            } else {
                return {
                    tokens: token,
                    offset: currentOffset,
                    lineOffset: lineNo,
                };
            }
        } else if (
            typeof token === 'string' ||
            typeof token.content === 'string'
        ) {
            // token includes cursorOffset - 1
            return { tokens, offset: 0, lineOffset: 0 };
        } else {
            // cursor is inside or just after token
            console.debug(
                `found token ${formatToken(token)} before cursor, descending`
            );
            const context = getContextAtCursor(
                token.content,
                cursorOffset - currentOffset
            );
            return {
                tokens: context.tokens,
                offset: context.offset + currentOffset,
                lineOffset: context.lineOffset + lineNo,
            };
        }
    }

    console.error("Couldn't find cursorOffset in tokens", tokens, cursorOffset);
    return { tokens: null, offset: 0, lineOffset: 0 };
}

export function getBracketString(token: Token): string | null {
    if (typeof token === 'string' || token.type !== 'punctuation') {
        return null;
    }
    if (typeof token.content !== 'string') {
        console.log(
            'getBracketString: found punctuation token with unexpected content',
            token.content
        );
        return null;
    }

    if (BRACKET_CHARACTERS.has(token.content)) {
        return token.content;
    } else {
        return null;
    }
}

export function getLineCount(token: Token): number {
    if (typeof token === 'string') {
        return token.split('\n').length - 1;
    }

    if (isSingleToken(token.content)) {
        return getLineCount(token.content);
    }

    return token.content.reduce((acc, cur) => acc + getLineCount(cur), 0);
}

/** Returns brackets that are still unclosed at cursor position, or empty array if balanced. */
export function getMissingBrackets(
    tokens: Prism.TokenStream,
    cursorOffset: number,
    lineOffset: number
): ClosingBracket[] {
    if (isSingleToken(tokens)) {
        console.error(`Unexpected tokens type: ${typeof tokens}`);
        if (typeof tokens !== 'string') {
            return getMissingBrackets(tokens.content, cursorOffset, lineOffset);
        }
        return [];
    }

    // this assumes that all relevant tokens are on the top-level of `tokens`.
    // (should be the case if using getContextAtCursor())
    const expectedBrackets: ClosingBracket[] = [];
    let currentOffset = 0;
    let lineNo = lineOffset;
    for (const token of tokens) {
        lineNo += getLineCount(token);
        const bracketString = getBracketString(token);
        switch (bracketString) {
            case '(':
                expectedBrackets.push({ bracket: ')', openedAtLine: lineNo });
                break;
            case '[':
                expectedBrackets.push({ bracket: ']', openedAtLine: lineNo });
                break;
            case '{':
                expectedBrackets.push({ bracket: '}', openedAtLine: lineNo });
                break;
            case ')':
            case ']':
            case '}':
                if (
                    expectedBrackets &&
                    expectedBrackets[expectedBrackets.length - 1].bracket ===
                        bracketString
                ) {
                    expectedBrackets.pop();
                } else {
                    console.error(
                        `Encountered unexpected bracket "${bracketString}", but expected last item in ${expectedBrackets}`
                    );
                    return [];
                }
        }
        currentOffset += token.length;

        //no need to check beyond cursor
        if (currentOffset >= cursorOffset) {
            break;
        }
    }
    return expectedBrackets;
}
