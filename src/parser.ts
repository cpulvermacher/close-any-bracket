import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index';
Prism.manual = true; //disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)

import { formatToken } from './debug';
import { getBracketString, getLineCount, isSingleToken } from './token';

export type ClosingBracket = {
    bracket: ')' | ']' | '}';
    openedAtLine: number;
};

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

export type Context = {
    tokens: Prism.TokenStream | null;
    offset: number; // offset of the context from the beginning of the input tokens
    lineOffset: number; // number of lines skipped before the start of the context
};

/** Returns the token or list of tokens that is relevant for the current cursor position.
 *
 * Might return a single token if we are a inside string/comment, or the entire file if
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
            // cursor inside a string token for current grammar
            const tokenStr = token.content as string;
            // if cursor is on the last char of the token and it's a quote, the cursor is not inside the string anymore
            if (
                token.length > 1 &&
                currentOffset + token.length === cursorOffset &&
                tokenStr[0] === tokenStr[token.length - 1]
            ) {
                return {
                    tokens,
                    offset: 0,
                    lineOffset: 0,
                };
            } else {
                return {
                    tokens: token,
                    offset: currentOffset,
                    lineOffset: lineNo,
                };
            }
        } else if (typeof token !== 'string' && token.type === 'comment') {
            if (
                token.length > 1 &&
                currentOffset + token.length === cursorOffset
            ) {
                // cursor on last char of comment token
                return {
                    tokens,
                    offset: 0,
                    lineOffset: 0,
                };
            } else {
                // cursor inside a comment token
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
            // cursor inside some other basic token (no nested tokens)
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

/** Returns brackets that are still unclosed at cursor position, or empty array if balanced.
 *
 * @param tokens token stream to search for missing brackets
 * @param cursorOffset offset inside `tokens` (will stop search here)
 * @param lineOffset number of lines that come before `tokens`
 */
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
        matchBracketsInToken(token, expectedBrackets, lineNo);

        currentOffset += token.length;
        //no need to check beyond cursor
        if (currentOffset >= cursorOffset) {
            break;
        }
    }
    return expectedBrackets;
}

/** If token is a bracket, adds to brackets if opening, or removes matching last bracket if closing. */
function matchBracketsInToken(
    token: string | Prism.Token,
    brackets: ClosingBracket[],
    lineNo: number
) {
    const bracket = getBracketString(token);
    switch (bracket) {
        case '(':
            brackets.push({ bracket: ')', openedAtLine: lineNo });
            break;
        case '[':
            brackets.push({ bracket: ']', openedAtLine: lineNo });
            break;
        case '{':
            brackets.push({ bracket: '}', openedAtLine: lineNo });
            break;
        case ')':
        case ']':
        case '}': {
            const lastBracket = brackets[brackets.length - 1]?.bracket;
            if (bracket === lastBracket) {
                brackets.pop();
            } else {
                throw new Error(
                    `Encountered unexpected bracket "${bracket}", but expected ${lastBracket}`
                );
            }
        }
    }
}
