import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let close = vscode.commands.registerCommand('anybrace.close', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		const cursorPosition = editor.selection.active;
		const insertString = findNearestUnclosedParenthesis(editor.document, cursorPosition);

		if (!insertString)
			return;

		editor.edit(editBuilder => {
			editBuilder.insert(editor.selection.active, insertString);
		});

	});
	context.subscriptions.push(close);
}

function findNearestUnclosedParenthesis(document: vscode.TextDocument, position: vscode.Position): string | null {

	const closeCounts = {
		parentheses: 0,
		brackets: 0,
		braces: 0,
	};

	//work backward from cursor position
	for (let line = position.line; line >= 0; line--) {
		let lineText = document.lineAt(line).text;
		if (line == position.line) {
			lineText = lineText.substr(0, position.character);
		}

		for (let i = lineText.length - 1; i >= 0; i--) {
			const char = lineText[i];

			//TODO what if other counts are non-zero?
			if (char === '(' && closeCounts.parentheses === 0) {
				return ')';
			}
			if (char === '[' && closeCounts.brackets === 0) {
				return ']';
			}
			if (char === '{' && closeCounts.braces === 0) {
				return '}';
			}

			if (char === ')') {
				closeCounts.parentheses++;
			} else if (char === ']') {
				closeCounts.brackets++;
			} else if (char === '}') {
				closeCounts.braces++;

			} else if (char === '(') {
				closeCounts.parentheses--;
			} else if (char === '[') {
				closeCounts.brackets--;
			} else if (char === '{') {
				closeCounts.braces--;
			}
		}
	}

	return null;
}

export function deactivate() { }
