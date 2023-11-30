// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "anybrace" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('anybrace.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from AnyBrace!');
	});

	context.subscriptions.push(disposable);

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
	const lineText = document.lineAt(position.line).text.substr(0, position.character);

	//work backward from cursor position
	const closeCounts = {
		parentheses: 0,
		brackets: 0,
		braces: 0,
	};

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
	//TODO search more lines

	return null;
}

// This method is called when your extension is deactivated
export function deactivate() { }
