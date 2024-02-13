import Prism from 'prismjs';
Prism.manual = true; //disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)
import loadLanguages from 'prismjs/components/index';

const BRACKET_CHARACTERS = new Set(['(', ')', '{', '}', '[', ']']);

export type ClosingBracket = {
    bracket: ')' | ']' | '}';
    openedAtLine: number;
};

export type Token = string | Prism.Token;

export function isSingleToken(token: Prism.TokenStream): token is Token {
    return typeof token === 'string' || 'content' in token;
}

/** get bracket that should be closed at cursor position */
export function getBracketToInsert(
    text: string,
    cursorOffset: number,
    languageId: string
): string | null {
    const missing = parseAndGetMissingBrackets(text, cursorOffset, languageId);
    if (!missing) {
        return null;
    }

    return missing[missing.length - 1].bracket;
}

export function closeToIndentAtLine(
    text: string,
    cursorOffset: number,
    languageId: string,
    lineNo: number,
    getLine: (line: number) => string
): string | null {
    const targetIndent = getIndentationLevelAtLine(lineNo, getLine);

    const missing = parseAndGetMissingBrackets(text, cursorOffset, languageId);
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

//TODO name
export function parseAndGetMissingBrackets(
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
    if (context === null) {
        return null;
    }
    console.debug('Current context', context);

    const missing = getMissingBrackets(context, cursorOffset);
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

/** Returns the token or list of tokens that is relevant for the current cursor position.
 *
 * Might return a single token if we are a string, the entire file if
 * we get only one(top - level) token, or something in between.
 *
 * Note that a cursor offset of x represents a position _before_ x! E.g. for
 * offset = 0, there are no tokens before 0, so this returns `null`.
 */
export function getContextAtCursor(
    tokens: Prism.TokenStream,
    cursorOffset: number
): Prism.TokenStream | null {
    if (cursorOffset <= 0) {
        return null;
    }

    if (isSingleToken(tokens)) {
        return cursorOffset <= tokens.length ? tokens : null;
    }

    let currentOffset = 0;
    for (const token of tokens) {
        //note: case for token starts after cursor cannot happen (cursorOffset > 0)

        if (currentOffset + token.length < cursorOffset) {
            // token ends before cursorOffset - 1, skip
            currentOffset += token.length;
        } else if (typeof token !== 'string' && token.type === 'string') {
            // if cursor is on the last char of the token and it's a quote, the cursor is not inside the string anymore
            const tokenStr =
                typeof token === 'string' ? token : (token.content as string);
            if (
                token.length > 1 &&
                currentOffset + token.length === cursorOffset &&
                tokenStr[0] === tokenStr[token.length - 1]
            ) {
                return tokens;
            } else {
                return token;
            }
        } else if (
            typeof token === 'string' ||
            typeof token.content === 'string'
        ) {
            console.debug(
                `got raw string token ${formatToken(token)}, returning`
            );
            // token includes cursorOffset - 1
            return tokens;
        } else {
            // cursor is inside or just after token
            console.debug(
                `found token ${formatToken(token)} before cursor, descending`
            );
            return getContextAtCursor(
                token.content,
                cursorOffset - currentOffset
            );
        }
    }

    console.error("Couldn't find cursorOffset in tokens", tokens, cursorOffset);
    return null;
}

/** Returns  brackets that are still unclosed at cursor position, or empty array if balanced. */
export function getMissingBrackets(
    tokens: Prism.TokenStream,
    cursorOffset: number
): ClosingBracket[] {
    if (isSingleToken(tokens)) {
        console.error(`Unexpected tokens type: ${typeof tokens}`);
        if (typeof tokens !== 'string') {
            return getMissingBrackets(tokens.content, cursorOffset);
        }
        return [];
    }

    // this assumes that all relevant tokens are on the top-level of `tokens`.
    // (should be the case if using getContextAtCursor())
    const expectedBrackets: ClosingBracket[] = [];
    let currentOffset = 0;
    let lineNo = 0;
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

export function getLineCount(token: Token): number {
    if (typeof token === 'string') {
        return token.split('\n').length - 1;
    }

    if (isSingleToken(token.content)) {
        return getLineCount(token.content);
    }

    return token.content.reduce((acc, cur) => acc + getLineCount(cur), 0);
}

/** returns either a opening/closing bracket character if the token represents one, or null. */
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

export function formatToken(token: Token): string {
    if (typeof token === 'string') {
        return `"${token}"`;
    }

    if (isSingleToken(token.content)) {
        return `"${formatToken(token.content)}"`;
    }

    return token.type;
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
