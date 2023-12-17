import Prism from 'prismjs';
Prism.manual = true; //disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)
import loadLanguages from 'prismjs/components/index';


const BRACKET_CHARACTERS = new Set(["(", ")", "{", "}", "[", "]"]);

export type ClosingBracket = ')' | ']' | '}';

type Token = string | Prism.Token;

function isSingleToken(token: Prism.TokenStream): token is Token {
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
    console.log("Tokenized input file:", allTokens);

    const tokenBeforeCursor = getTokenBeforeOffset(allTokens, cursorOffset);
    console.log(`Token before cursor`, tokenBeforeCursor);

    if (tokenBeforeCursor === null) {
        return null;
    }

    //TODO there's a difference between 'before cursor' and 'surrounds cursor' (which is what context refers to)
    // to get proper context, I'd want to 
    const context = getContextAtCursor(allTokens, tokenBeforeCursor);

    //TODO
    // If we're inside a (non-template) string, fall back to dumb algorithm

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

/** Returns the list of tokens immediately before given offset.
 * 
 * A cursor offset of x represents a position _before_ x! E.g. for
 * offset = 0, there are no tokens before 0, so this returns `null`.

 * Usually this returns a single Token, but for a nested context
 * (e.g. inside template strings) there may be multiple elements.
 */
export function getTokenBeforeOffset(tokens: Prism.TokenStream, cursorOffset: number): Token[] | null {
    if (cursorOffset === 0) {
        return null;
    }

    if (isSingleToken(tokens)) {
        return (cursorOffset <= tokens.length) ? [tokens] : null;
    }

    let currentOffset = 0;
    for (const token of tokens) {
        //note: case for token starts after cursor cannot happen (cursorOffset > 0)

        if (currentOffset + token.length < cursorOffset) {
            // token ends before cursorOffset - 1, skip
            currentOffset += token.length;
        } else {
            // token includes cursorOffset - 1
            if (typeof token === 'string' || typeof token.content === 'string') {
                return [token];
            } else {
                const childTokens = getTokenBeforeOffset(token.content, cursorOffset - currentOffset);
                if (!childTokens) {
                    return [token];
                }
                childTokens.unshift(token);
                return childTokens;
            }
        }
    }

    console.error("Couldn't find cursorOffset in tokens", tokens, cursorOffset);
    return null;

}

/**
 * use tokens at cursor offset to determine what our scope is.;
 * this might be the entire file if we get only one(top - level) token,
 * or e.g.a template string.*/
export function getContextAtCursor(allTokens: Token[], tokensAtCursor: Token[] | null): Prism.TokenStream {
    if (tokensAtCursor === null || tokensAtCursor.length <= 1) {
        return allTokens;
    }

    //for tokensAtCursor.length >= 2, return the next level up
    return tokensAtCursor[tokensAtCursor.length - 2];
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
    let tokenStr;
    if (typeof token === 'string') {
        tokenStr = token;
    } else if (token.type === 'punctuation') {
        tokenStr = token.content as string;
    } else {
        return null;
    }

    if (BRACKET_CHARACTERS.has(tokenStr)) {
        return tokenStr;
    } else {
        return null;
    }
}