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
    let bracketsToClose = '';
    const missing = getMissingBrackets(
        text,
        cursorOffset,
        languageId,
        parseOptions
    );
    if (!missing) {
        return bracketsToClose;
    }

    const targetIndent = getIndentationLevelAtLine(lineNo, getLine);
    console.debug('Target indent:', targetIndent, 'missing brackets:', missing);
    // iterate in reverse order until we find a bracket that was opened at less than targetIndent
    for (let i = missing.length - 1; i >= 0; i--) {
        const bracket = missing[i];
        const indentForOpeningBracket = getIndentationLevelAtLine(
            bracket.lineNo,
            getLine
        );
        if (indentForOpeningBracket < targetIndent) {
            break;
        }
        bracketsToClose += toClosingBracket(bracket);
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
 * @returns array of missing closing brackets, or null if none found
 */
export function getMissingBrackets(
    text: string,
    cursorOffset: number,
    languageId: string,
    options: ParseOptions
): BracketInfo[] | null {
    const context = getContext(text, cursorOffset, languageId);
    if (context === null) {
        return null;
    }

    const brackets = getBracketsForContext(context.tokens, context.lineOffset);

    const missingBrackets = matchBrackets(
        brackets,
        cursorOffset - context.offset,
        options
    );

    const bracketsToCloseAtCursor = missingBrackets.filter(
        (bracket) => bracket.offset < cursorOffset - context.offset
    );

    return bracketsToCloseAtCursor.length > 0 ? bracketsToCloseAtCursor : null;
}

function matchBrackets(
    brackets: BracketInfo[],
    cursorOffset: number,
    options: ParseOptions
) {
    const unclosedBrackets: BracketInfo[] = [];
    for (const bracket of brackets) {
        if (!options.ignoreAlreadyClosed && bracket.offset >= cursorOffset) {
            break;
        }

        if (
            bracket.bracket === '(' ||
            bracket.bracket === '[' ||
            bracket.bracket === '{'
        ) {
            //opening bracket
            unclosedBrackets.push(bracket);
        } else {
            //closing bracket
            const lastOpened = unclosedBrackets[unclosedBrackets.length - 1];
            if (shouldStopMatching(lastOpened, bracket, cursorOffset)) {
                break;
            }

            // remove last opened bracket
            unclosedBrackets.pop();
            //TODO during matching, if closeToIndent + ignoreAlreadyClosed, we need to take indent of brackets into account
        }
    }

    return unclosedBrackets;
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
function shouldStopMatching(
    lastOpened: BracketInfo,
    bracket: BracketInfo,
    cursorOffset: number
): boolean {
    if (lastOpened && bracket.bracket === toClosingBracket(lastOpened)) {
        // this is the expected closing bracket
        return false;
    }

    // some kind of mismatch...
    if (cursorOffset <= bracket.offset) {
        // ...this is a fairly normal thing if it happens after the cursor
        return true; //TODO maybe need to continue depending on options
    } else {
        // ...but before the cursor, it will probably mess up anything we do
        throw new Error(
            `Unexpected closing bracket ${bracket.bracket} in line ${bracket.lineNo}, but expected ${lastOpened?.bracket}`
        );
    }
}
