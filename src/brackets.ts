import { parse } from './parser';

/** get single bracket that should be closed at cursor position */
export function closeBracket(
    text: string,
    cursorOffset: number,
    languageId: string
): string | null {
    const missing = parse(text, cursorOffset, languageId);
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
 *     abc.def(); <- returns null, nothing to close in this line (indent level 4)
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
    getLine: (line: number) => string
): string | null {
    const targetIndent = getIndentationLevelAtLine(lineNo, getLine);

    const missing = parse(text, cursorOffset, languageId);
    if (!missing) {
        return null;
    }

    console.debug('Target indent:', targetIndent);
    // iterate in reverse order until we find a bracket that was opened at less than targetIndent
    let bracketsToClose = '';
    for (let i = missing.length - 1; i >= 0; i--) {
        const bracket = missing[i];
        const indentForOpeningBracket = getIndentationLevelAtLine(
            bracket.openedAtLine,
            getLine
        );
        console.debug(
            `Bracket ${bracket.bracket} opened at line ${bracket.openedAtLine} with indent ${indentForOpeningBracket}`
        );
        if (indentForOpeningBracket < targetIndent) {
            console.debug(`Stopping search`);
            break;
        }
        bracketsToClose += bracket.bracket;
    }

    return bracketsToClose ? bracketsToClose + '\n' : null;
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
