import * as vscode from 'vscode';
import { getBracketToInsert } from './util';

export function deactivate() { }

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let close = vscode.commands.registerCommand('close-any-bracket.close', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const cursorPosition = editor.selection.active;
		const cursorOffset = editor.document.offsetAt(cursorPosition);
		const insertString = getBracketToInsert(editor.document.getText(), cursorOffset, editor.document.languageId);
		if (!insertString) {
			return;
		}

		editor.edit(editBuilder => {
			editBuilder.insert(editor.selection.active, insertString);
		});

	});
	context.subscriptions.push(close);
}
