import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index';
Prism.manual = true; //disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)

import { formatToken } from './debug';
import { getLineCount, isSingleToken } from './token';

export type Context = {
    tokens: Prism.TokenStream;
    offset: number; // offset of the context from the beginning of the input tokens
    lineOffset: number; // number of lines skipped before the start of the context
};

export function getContext(
    text: string,
    cursorOffset: number,
    languageId: string
): Context | null {
    const grammar = getGrammar(languageId);
    if (!grammar) {
        console.log(`Couldn't find grammar for language ${languageId}`);
        return null;
    }

    const allTokens = Prism.tokenize(text, grammar);

    return getContextAtCursor(allTokens, cursorOffset);
}

/**
 * Maps VSCode language identifiers (https://code.visualstudio.com/docs/languages/identifiers)
 * to Grammar (https://prismjs.com/#supported-languages) or null if not found
 */
export function getGrammar(languageId: string): Prism.Grammar | null {
    let grammarId: string;
    switch (languageId) {
        case 'bat':
            grammarId = 'batch';
            break;
        case 'bibtex':
            grammarId = 'tex';
            break;
        case 'cuda-cpp':
            grammarId = 'cpp';
            break;
        case 'dockercompose':
            grammarId = 'yaml';
            break;
        case 'git-commit':
        case 'git-rebase':
            grammarId = 'git';
            break;
        case 'jade':
            grammarId = 'pug';
            break;
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
        case 'objective-cpp':
            grammarId = 'cpp';
            break;
        case 'perl6':
            grammarId = 'perl';
            break;
        case 'shellscript':
            grammarId = 'shell';
            break;
        case 'slim':
            grammarId = 'pug';
            break;
        case 'svelte':
            grammarId = 'html';
            break;
        case 'Vimscript':
            grammarId = 'vim';
            break;
        case 'vue':
        case 'vue-html':
            grammarId = 'html';
            break;
        case 'xsl':
            grammarId = 'xml';
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
 * Might return a single token if we are a inside string/comment, or the entire file if
 * we get only one (top-level) token, or something in between.
 *
 * Note that a cursor offset of x represents a position _before_ x! E.g. for
 * offset = 0, there are no tokens before 0, so this returns `null`.
 */
export function getContextAtCursor(
    tokens: Prism.TokenStream,
    cursorOffset: number
): Context | null {
    if (cursorOffset <= 0) {
        return null;
    }

    if (isSingleToken(tokens)) {
        if (cursorOffset > tokens.length) {
            return null;
        }

        return { tokens, offset: 0, lineOffset: 0 };
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
            if (context === null) {
                return null;
            }
            return {
                tokens: context.tokens,
                offset: context.offset + currentOffset,
                lineOffset: context.lineOffset + lineNo,
            };
        }
    }

    console.error("Couldn't find cursorOffset in tokens", tokens, cursorOffset);
    return null;
}
