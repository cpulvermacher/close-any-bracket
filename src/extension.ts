import * as vscode from 'vscode';
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index';

//load all languages
loadLanguages();

const BRACKET_CHARACTERS = new Set(["(", ")", "{", "}", "[", "]"]);

export function deactivate() { }

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let close = vscode.commands.registerCommand('close-any-bracket.close', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const grammar = getGrammar(editor.document.languageId);
		if (!grammar) {
			console.log(`Couldn't find grammar for language ${editor.document.languageId}`);
			return;
		}

		const allTokens = Prism.tokenize(editor.document.getText(), grammar);
		console.log("Tokenized input file:", allTokens);

		const cursorPosition = editor.selection.active;
		const cursorOffset = editor.document.offsetAt(cursorPosition);
		const tokensAtCursor = getTokensAtOffset(allTokens, cursorOffset);
		console.log("Token at cursor", tokensAtCursor);
		//TODO at end of file this is null.

		const context = getContextAtCursor(allTokens, tokensAtCursor);

		// If we're inside a (non-template) string, fall back to dumb algorithm
		//TODO

		// but how do we define "in"?
		//TODO

		const missing = getMissingBrackets(context, cursorOffset);
		console.log(`Found missing brackets: ${missing}`);
		if (!missing) {
			return;
		}

		const insertString = missing[missing.length - 1];
		editor.edit(editBuilder => {
			editBuilder.insert(editor.selection.active, insertString);
		});

	});
	context.subscriptions.push(close);
}

export type ClosingBracket = ')' | ']' | '}';

/**
 * Maps VSCode language identifiers (https://code.visualstudio.com/docs/languages/identifiers)
 * to Grammar (https://prismjs.com/#supported-languages) or null if not found
 */
function getGrammar(languageId: string): Prism.Grammar | null {

	let grammarId: string;
	switch (languageId) {
		case 'javascriptreact':
			grammarId = 'jsx';
			break;
		case 'typescriptreact':
			grammarId = 'tsx';
		case 'objective-c':
			grammarId = 'objectivec';
			break;
		default:
			grammarId = languageId;
			break;
	}

	return Prism.languages[grammarId] || null;
}

/** Returns the list of tokens at given offset.
 * This will usually be a single Token, but for a nested context
 * (e.g. inside template strings) there may be multiple elements.
 */
function getTokensAtOffset(tokens: Prism.TokenStream, offset: number): (string | Prism.Token)[] | null {
	if (typeof tokens === 'string' || 'content' in tokens) {
		// terminal token (string | Token)
		return (offset < tokens.length) ? [tokens] : null;
	}

	let currentOffset = 0;
	for (const token of tokens) {
		if (currentOffset + token.length > offset) {
			if (typeof token === 'string' || typeof token.content === 'string') {
				return [token];
			} else {
				const childTokens = getTokensAtOffset(token.content, offset - currentOffset);
				childTokens?.unshift(token);
				return childTokens;

			}
		}
		currentOffset += token.length;
	}
	return null;
}

/**
 * use tokens at cursor offset to determine what our scope is.;
 * this might be the entire file if we get only one(top - level) token,
 * or e.g.a template string.*/
function getContextAtCursor(allTokens: (string | Prism.Token)[], tokensAtCursor: (string | Prism.Token)[] | null): Prism.TokenStream {
	if (tokensAtCursor === null || tokensAtCursor.length <= 1) {
		return allTokens;
	}

	//for tokensAtCursor.length >= 2, return the next level up
	return tokensAtCursor[tokensAtCursor.length - 2];
}

/** Returns an array like ["}", ")"] with the brackets that are
 * still unclosed at cursor position, or [] if balanced. */
function getMissingBrackets(tokens: Prism.TokenStream, cursorOffset: number): string[] {
	if (typeof tokens === 'string' || 'type' in tokens) {
		throw new Error(`Unexpected tokens type: ${typeof tokens}`);
	}

	// this assumes that all relevant tokens are on the top-level of `tokens`.
	// (should be the case if using getContextAtCursor())
	let expectedBrackets: string[] = [];
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
					//TODO this shows an error to the user, avoid
					throw new Error(`Encountered unexpected bracket "${bracketString}", but expected last item in ${expectedBrackets}`);
				}
			}

		}
		currentOffset += token.length;

		//no need to check beyond cursor
		if (currentOffset > cursorOffset) {
			break;
		}
	}
	return expectedBrackets;
}

/** returns either a opening/closing bracket character if the token represents one, or null. */
function getBracketString(token: string | Prism.Token): string | null {
	var tokenStr;
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
