import Prism from 'prismjs';

import { getContext } from './parser';
import {
    BracketCharacter,
    getBracketString,
    getLineCount,
    isSingleToken,
} from './token';

export type BracketInfo = {
    bracket: BracketCharacter;
    offset: number;
    lineNo: number;
};

export type ClosingBracket = ')' | ']' | '}';

export type ParseOptions = {
    ignoreAlreadyClosed?: boolean;
    closeToIndent?: boolean;
};

/** get single bracket that should be closed at cursor position */
export function closeBracket(
    text: string,
    cursorOffset: number,
    languageId: string,
    parseOptions: ParseOptions
): ClosingBracket | null {
    if (parseOptions.closeToIndent) {
        throw new Error(
            'closeBracket() does not support closeToIndent option. Use closeToIndentAtLine() instead.'
        );
    }

    const missing = getMissingBrackets(
        text,
        cursorOffset,
        languageId,
        parseOptions
    );
    if (!missing) {
        return null;
    }

    return toClosingBracket(missing[missing.length - 1]);
}

/**
 * gets string with all brackets that should be closed at the given lineNo,
 * using the indentation at the line to determine depth.
 *
 * E.g.
 * ```
 * if (abc) { // opened at level 0
 *     abc.def(); <- returns ``, nothing to close in this line (indent level 4)
 *     for (a of list) { // opened at level 4
 *         // ...
 *     // <- returns `}` (closing unclosed for-loop on same level)
 * // <- returns `}}` (closing both for and if, since opened at level >= 0)
 * ```
 */
export function closeToIndentAtLine(
    text: string,
    cursorOffset: number,
    languageId: string,
    lineNo: number,
    getLine: (line: number) => string,
    parseOptions: ParseOptions
): string {
    // get line range for block at lineNo with same or higher indentation
    const targetIndent = getIndentationLevelAtLine(lineNo, getLine);
    const filterBrackets = (brackets: BracketInfo[]) => {
        if (targetIndent === 0) {
            return brackets;
        }

        let targetBrackets: BracketInfo[] = [];
        for (const bracket of brackets) {
            const indent = getIndentationLevelAtLine(bracket.lineNo, getLine);
            if (indent >= targetIndent) {
                targetBrackets.push(bracket);
            } else if (bracket.lineNo < lineNo) {
                //block ended before target line, discard
                targetBrackets = [];
            } else {
                //block ended after target line, we're done
                break;
            }
        }
        return targetBrackets;
    };

    let bracketsToClose = '';
    const missing = getMissingBrackets(
        text,
        cursorOffset,
        languageId,
        parseOptions,
        filterBrackets
    );
    if (!missing) {
        return bracketsToClose;
    }

    console.debug('Target indent:', targetIndent, 'missing brackets:', missing);
    for (let i = missing.length - 1; i >= 0; i--) {
        bracketsToClose += toClosingBracket(missing[i]);
    }

    return bracketsToClose;
}

/**
 * Returns the indentation level at the given line.
 *
 * @param lineNo line number
 * @param getLine function that returns the content of a specific line.
 */
export function getIndentationLevelAtLine(
    lineNo: number,
    getLine: (line: number) => string
): number {
    const line = getLine(lineNo);

    let indentationLevel = 0;
    for (const c of line) {
        if (c !== ' ' && c !== '\t') {
            break;
        }

        if (c === ' ') {
            indentationLevel++;
        } else if (c === '\t') {
            // Assuming a tab is equivalent to 4 spaces
            indentationLevel += 4;
        }
    }

    return indentationLevel;
}

/**
 * Parses the given text to find missing closing brackets at the specified cursor offset.
 *
 * @param text text to parse
 * @param cursorOffset offset of the cursor within the text
 * @param languageId VSCode language identifier for text
 * @param options options for parsing
 * @param bracketFilter optional filter for brackets to consider
 * @returns array of missing opening brackets, or null if none found
 */
export function getMissingBrackets(
    text: string,
    cursorOffset: number,
    languageId: string,
    options: ParseOptions,
    bracketFilter?: (brackets: BracketInfo[]) => BracketInfo[]
): BracketInfo[] | null {
    const context = getContext(text, cursorOffset, languageId);
    if (context === null) {
        return null;
    }

    const allBrackets = getBracketsForContext(
        context.tokens,
        context.lineOffset
    );
    const filteredBrackets = bracketFilter
        ? bracketFilter(allBrackets)
        : allBrackets;

    const missingBrackets = matchBrackets(
        filteredBrackets,
        cursorOffset - context.offset,
        options
    );

    const bracketsToCloseAtCursor = missingBrackets.filter(
        (bracket) => bracket.offset < cursorOffset - context.offset
    );

    return bracketsToCloseAtCursor.length > 0 ? bracketsToCloseAtCursor : null;
}

/** returns opening brackets that are unclosed at cursor */
function matchBrackets(
    brackets: BracketInfo[],
    cursorOffset: number,
    options: ParseOptions
): BracketInfo[] {
    const openBracketsBeforeCursor: BracketInfo[] =
        getUnclosedBracketsBeforeCursor(brackets, cursorOffset);
    if (!options.ignoreAlreadyClosed) {
        return openBracketsBeforeCursor;
    }

    const closedBracketsAfterCursor: BracketInfo[] =
        getUnopenedBracketsAfterCursor(brackets, cursorOffset);

    // match remaining unclosed brackets with unopened brackets from outside in
    for (const closedBracket of closedBracketsAfterCursor) {
        if (openBracketsBeforeCursor.length === 0) {
            break;
        }

        const openBracket = openBracketsBeforeCursor[0];
        if (toClosingBracket(openBracket) !== closedBracket.bracket) {
            // this may still be good enough, so don't throw
            console.error(
                "Can't match brackets around cursor",
                openBracket,
                closedBracket
            );
            break;
        }

        openBracketsBeforeCursor.shift();
    }
    return openBracketsBeforeCursor;
}

function getUnclosedBracketsBeforeCursor(
    brackets: BracketInfo[],
    cursorOffset: number
) {
    const openBrackets: BracketInfo[] = [];
    for (const bracket of brackets) {
        if (bracket.offset >= cursorOffset) {
            break;
        }

        if (isOpeningBracket(bracket)) {
            openBrackets.push(bracket);
        } else {
            // remove last opened bracket
            const lastOpened = openBrackets.pop();
            if (
                lastOpened &&
                bracket.bracket !== toClosingBracket(lastOpened)
            ) {
                throw new Error(
                    `Unexpected closing bracket ${bracket.bracket} in line ${bracket.lineNo}, but expected ${lastOpened.bracket}`
                );
            }
        }
    }
    return openBrackets;
}

function getUnopenedBracketsAfterCursor(
    brackets: BracketInfo[],
    cursorOffset: number
) {
    const closedBrackets: BracketInfo[] = [];
    // iterate in reverse since we are most likely in
    // the middle of a file - we want to essentially repeat the above process
    // from the end of the file
    for (let i = brackets.length - 1; i >= 0; i--) {
        const bracket = brackets[i];
        if (bracket.offset < cursorOffset) {
            break;
        }

        if (isOpeningBracket(bracket)) {
            const lastClosed = closedBrackets[closedBrackets.length - 1];
            if (
                lastClosed &&
                toClosingBracket(bracket) === lastClosed.bracket
            ) {
                closedBrackets.pop();
            }
        } else {
            closedBrackets.push(bracket);
        }
    }
    return closedBrackets;
}

/** Returns all brackets in the given token stream.
 *
 * @param tokens token stream to search for missing brackets
 * @param lineOffset number of lines that come before `tokens`
 */
export function getBracketsForContext(
    tokens: Prism.TokenStream,
    lineOffset: number
): BracketInfo[] {
    if (isSingleToken(tokens)) {
        console.error(`Unexpected tokens type: ${typeof tokens}`);
        if (typeof tokens !== 'string') {
            return getBracketsForContext(tokens.content, lineOffset);
        }
        return [];
    }

    // this assumes that all relevant tokens are on the top-level of `tokens`.
    // (should be the case if using getContextAtCursor())
    const brackets: BracketInfo[] = [];
    let currentOffset = 0;
    let lineNo = lineOffset;
    for (const token of tokens) {
        lineNo += getLineCount(token);
        const bracket = getBracketString(token);
        if (bracket !== null) {
            brackets.push({
                bracket,
                offset: currentOffset,
                lineNo: lineNo,
            });
        }
        currentOffset += token.length;
    }
    return brackets;
}

function isOpeningBracket(bracket: BracketInfo): boolean {
    return (
        bracket.bracket === '(' ||
        bracket.bracket === '[' ||
        bracket.bracket === '{'
    );
}

function toClosingBracket(bracket: BracketInfo): ClosingBracket {
    switch (bracket.bracket) {
        case '(':
            return ')';
        case '[':
            return ']';
        case '{':
            return '}';
        default:
            throw new Error(`Unexpected bracket: ${bracket.bracket}`);
    }
}
