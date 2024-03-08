import Prism from 'prismjs';

import { getContext } from './parser';
import { getBracketString, getLineCount, isSingleToken } from './token';

export type Bracket = {
    bracket: ')' | ']' | '}';
    openedAt: number; //cursor offset
    openedAtLine: number;
    closedAt?: number; //cursor offset, if closed
};

export type ParseOptions = {
    ignoreAlreadyClosed?: boolean;
};

export const defaultParseOptions: ParseOptions = {
    ignoreAlreadyClosed: false,
};

/** get single bracket that should be closed at cursor position */
export function closeBracket(
    text: string,
    cursorOffset: number,
    languageId: string,
    parseOptions: ParseOptions = defaultParseOptions
): string | null {
    const missing = parse(text, cursorOffset, languageId, parseOptions);
    if (!missing) {
        return null;
    }

    return missing[missing.length - 1].bracket;
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
    parseOptions: ParseOptions = defaultParseOptions
): string {
    let bracketsToClose = '';
    const missing = parse(text, cursorOffset, languageId, parseOptions);
    if (!missing) {
        return bracketsToClose;
    }

    const targetIndent = getIndentationLevelAtLine(lineNo, getLine);
    console.debug('Target indent:', targetIndent, 'missing brackets:', missing);
    // iterate in reverse order until we find a bracket that was opened at less than targetIndent
    for (let i = missing.length - 1; i >= 0; i--) {
        const bracket = missing[i];
        const indentForOpeningBracket = getIndentationLevelAtLine(
            bracket.openedAtLine,
            getLine
        );
        if (indentForOpeningBracket < targetIndent) {
            break;
        }
        bracketsToClose += bracket.bracket;
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
export function parse(
    text: string,
    cursorOffset: number,
    languageId: string,
    options: ParseOptions
): Bracket[] | null {
    const context = getContext(text, cursorOffset, languageId);
    if (context === null) {
        return null;
    }

    const brackets = getBracketsForContext(
        context.tokens!,
        context.lineOffset,
        cursorOffset
    );

    //get all brackets opened before cursor, but unclosed (before or after cursor)
    const isUnclosed = (bracket: Bracket) => {
        if (bracket.openedAt >= cursorOffset - context.offset) {
            return false;
        }

        if (
            !options.ignoreAlreadyClosed &&
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

/** Returns all opened brackets in the given token stream.
 *
 * @param tokens token stream to search for missing brackets
 * @param lineOffset number of lines that come before `tokens`
 */
export function getBracketsForContext(
    tokens: Prism.TokenStream,
    lineOffset: number,
    cursorPosition: number
): Bracket[] {
    if (isSingleToken(tokens)) {
        console.error(`Unexpected tokens type: ${typeof tokens}`);
        if (typeof tokens !== 'string') {
            return getBracketsForContext(
                tokens.content,
                lineOffset,
                cursorPosition
            );
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
        try {
            matchBracketsInToken(token, brackets, currentOffset, lineNo);
        } catch (e) {
            // found a mismatched bracket, stop.
            if (cursorPosition <= currentOffset) {
                // this is a fairly normal thing if it happens after the cursor
                break;
            } else {
                console.log('before cursor:', cursorPosition, currentOffset);
                // but before the cursor, it will probably mess up any thing we do
                throw e;
            }
        }
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
                    `Encountered unexpected bracket ${bracket} in line ${lineNo}, but expected ${lastOpened?.bracket}`
                );
            }
            lastOpened.closedAt = tokenOffset;
        }
    }
}
