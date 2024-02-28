import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index';
Prism.manual = true; //disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)

import { formatToken } from './debug';
import { getBracketString, getLineCount, isSingleToken } from './token';

export type Bracket = {
    bracket: ')' | ']' | '}';
    openedAt: number; //cursor offset
    openedAtLine: number;
    closedAt?: number; //cursor offset, if closed
};

export type ParseOptions = {
    onlySearchClosingBracketsUntilCursor?: boolean;
};

export const defaultParseOptions: ParseOptions = {
    onlySearchClosingBracketsUntilCursor: true,
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
    languageId: string,
    options: ParseOptions = defaultParseOptions
): Bracket[] | null {
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

    const brackets = getBrackets(context.tokens, context.lineOffset);

    //get all brackets opened before cursor, but unclosed (before or after cursor)
    const isUnclosed = (bracket: Bracket) => {
        if (bracket.openedAt >= cursorOffset - context.offset) {
            return false;
        }

        if (
            !!options.onlySearchClosingBracketsUntilCursor &&
            bracket.closedAt &&
            bracket.closedAt >= cursorOffset - context.offset
        ) {
            return true;
        }

        return bracket.closedAt === undefined;
    };

    const missing = brackets.filter(isUnclosed);

    return missing.length > 0 ? missing : null;
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
        } else if (
            typeof token !== 'string' &&
            (token.type === 'string' || token.type === 'comment') &&
            currentOffset + token.length > cursorOffset
        ) {
            // cursor inside a string/comment and not after the last character
            return {
                tokens: token,
                offset: currentOffset,
                lineOffset: lineNo,
            };
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

/** Returns all opened brackets in the given token stream.
 *
 * @param tokens token stream to search for missing brackets
 * @param lineOffset number of lines that come before `tokens`
 */
export function getBrackets(
    tokens: Prism.TokenStream,
    lineOffset: number
): Bracket[] {
    if (isSingleToken(tokens)) {
        console.error(`Unexpected tokens type: ${typeof tokens}`);
        if (typeof tokens !== 'string') {
            return getBrackets(tokens.content, lineOffset);
        }
        return [];
    }

    // this assumes that all relevant tokens are on the top-level of `tokens`.
    // (should be the case if using getContextAtCursor())
    const brackets: Bracket[] = [];
    let currentOffset = 0;
    let lineNo = lineOffset;
    for (const token of tokens) {
        lineNo += getLineCount(token);
        matchBracketsInToken(token, brackets, currentOffset, lineNo);
        currentOffset += token.length;
    }
    return brackets;
}

/** If token is a bracket, adds to brackets if opening, or removes matching last bracket if closing. */
function matchBracketsInToken(
    token: string | Prism.Token,
    brackets: Bracket[],
    tokenOffset: number,
    lineNo: number
) {
    const bracket = getBracketString(token);
    switch (bracket) {
        case '(':
            brackets.push({
                bracket: ')',
                openedAt: tokenOffset,
                openedAtLine: lineNo,
            });
            break;
        case '[':
            brackets.push({
                bracket: ']',
                openedAt: tokenOffset,
                openedAtLine: lineNo,
            });
            break;
        case '{':
            brackets.push({
                bracket: '}',
                openedAt: tokenOffset,
                openedAtLine: lineNo,
            });
            break;
        case ')':
        case ']':
        case '}': {
            //find last opened bracket of the same type
            const lastOpened = brackets
                .slice()
                .reverse()
                .find((b) => b.closedAt === undefined);
            if (bracket !== lastOpened?.bracket) {
                throw new Error(
                    `Encountered unexpected bracket "${bracket}", but expected ${lastOpened?.bracket}`
                );
            }
            lastOpened.closedAt = tokenOffset;
        }
    }
}
