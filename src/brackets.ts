import Prism from 'prismjs';
Prism.manual = true; //disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)
import loadLanguages from 'prismjs/components/index';


const BRACKET_CHARACTERS = new Set(["(", ")", "{", "}", "[", "]"]);

export type ClosingBracket = ')' | ']' | '}';

export type Token = string | Prism.Token;

export function isSingleToken(token: Prism.TokenStream): token is Token {
    return typeof token === 'string' || 'content' in token;
}

/** get bracket that should be closed at cursor position */
export function getBracketToInsert(text: string, cursorOffset: number, languageId: string): ClosingBracket | null {
    const grammar = getGrammar(languageId);
    if (!grammar) {
        console.log(`Couldn't find grammar for language ${languageId}`);
        return null;
    }

    const allTokens = Prism.tokenize(text, grammar);
    console.debug("Tokenized input file:", allTokens);

    const context = getContextAtCursor(allTokens, cursorOffset);
    if (context === null) {
        return null;
    }
    console.debug("Current context", context);

    const missing = getMissingBrackets(context, cursorOffset);
    if (!missing || missing.length === 0) {
        return null;
    }

    return missing[missing.length - 1];
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
export function getContextAtCursor(tokens: Prism.TokenStream, cursorOffset: number): Prism.TokenStream | null {
    if (cursorOffset <= 0) {
        return null;
    }

    if (isSingleToken(tokens)) {
        return (cursorOffset <= tokens.length) ? tokens : null;
    }

    let currentOffset = 0;
    for (const token of tokens) {
        //note: case for token starts after cursor cannot happen (cursorOffset > 0)

        if (currentOffset + token.length < cursorOffset) {
            // token ends before cursorOffset - 1, skip
            currentOffset += token.length;
        } else if (typeof token !== 'string' && token.type === 'string') {
            // if cursor is on the last char of the token and it's a quote, the cursor is not inside the string anymore
            const tokenStr = typeof token === 'string' ? token : token.content as string;
            if (token.length > 1 && currentOffset + token.length === cursorOffset && tokenStr[0] === tokenStr[token.length - 1]) {
                return tokens;
            } else {
                return token;
            }
        } else if (typeof token === 'string' || typeof token.content === 'string') {
            console.debug(`got raw string token ${formatToken(token)}, returning`);
            // token includes cursorOffset - 1
            return tokens;
        } else {
            // cursor is inside or just after token
            console.debug(`found token ${formatToken(token)} before cursor, descending`);
            return getContextAtCursor(token.content, cursorOffset - currentOffset);
        }
    }

    console.error("Couldn't find cursorOffset in tokens", tokens, cursorOffset);
    return null;
}

/** Returns an array like ["}", ")"] with the brackets that are
 * still unclosed at cursor position, or [] if balanced. */
export function getMissingBrackets(tokens: Prism.TokenStream, cursorOffset: number): ClosingBracket[] {

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
    for (const token of tokens) {
        const bracketString = getBracketString(token);
        if (bracketString) {
            if (bracketString === '(') {
                expectedBrackets.push(')');
            } else if (bracketString === '[') {
                expectedBrackets.push(']');
            } else if (bracketString === '{') {
                expectedBrackets.push('}');
            } else if (bracketString === ')' || bracketString === ']' || bracketString === '}') {
                if (expectedBrackets && expectedBrackets[expectedBrackets.length - 1] === bracketString) {
                    expectedBrackets.pop();
                } else {
                    console.error(`Encountered unexpected bracket "${bracketString}", but expected last item in ${expectedBrackets}`);
                    return [];
                }
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

/** returns either a opening/closing bracket character if the token represents one, or null. */
export function getBracketString(token: Token): string | null {
    if (typeof token === 'string' || token.type !== 'punctuation') {
        return null;
    }
    if (typeof token.content !== 'string') {
        console.log("getBracketString: found punctuation token with unexpected content", token.content);
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