import Prism from 'prismjs';

const BRACKET_CHARACTERS = new Set(['(', ')', '{', '}', '[', ']']);

export type Token = string | Prism.Token;

export function isSingleToken(token: Prism.TokenStream): token is Token {
    return typeof token === 'string' || 'content' in token;
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

/** returns the number of lines in the token */
export function getLineCount(token: Token): number {
    if (typeof token === 'string') {
        return token.split('\n').length - 1;
    }

    if (isSingleToken(token.content)) {
        return getLineCount(token.content);
    }

    return token.content.reduce((acc, cur) => acc + getLineCount(cur), 0);
}
