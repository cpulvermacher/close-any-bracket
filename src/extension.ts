import * as vscode from 'vscode';
import { getBracketToInsert, getIndentationLevelAtLine } from './brackets';

export function deactivate() { /* nothing to do here */ }

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const close = vscode.commands.registerCommand('close-any-bracket.close', () => {
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

	const closeToIndent = vscode.commands.registerCommand('close-any-bracket.close-to-indent', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const cursorPosition = editor.selection.active;
		const targetIndent = getIndentationLevelAtLine(cursorPosition.line, (line) => getLine(editor.document, line));

		console.log(`target indent: ${targetIndent}`);
	});

	context.subscriptions.push(close, closeToIndent);
}

function getLine(document: vscode.TextDocument, line: number) {
	return document.lineAt(line).text;
}