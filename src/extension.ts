// allowed only in extension.ts, since it cannot be imported in unit tests.
// eslint-disable-next-line no-restricted-imports
import * as vscode from 'vscode';

import { closeBracket, closeToIndentAtLine } from './brackets';

// called the first time a command is executed
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('close-any-bracket.close', close),
        vscode.commands.registerCommand(
            'close-any-bracket.close-to-indent',
            closeToIndent
        )
    );
}

export function deactivate() {
    /* nothing to do here */
}

function close() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const cursorPosition = editor.selection.active;
    const cursorOffset = editor.document.offsetAt(cursorPosition);

    const insertString = closeBracket(
        editor.document.getText(),
        cursorOffset,
        editor.document.languageId,
        getParserOptions()
    );

    if (insertString) {
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, insertString);
        });
    }
}

function closeToIndent() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const cursorPosition = editor.selection.active;
    const cursorOffset = editor.document.offsetAt(cursorPosition);

    const missingBrackets = closeToIndentAtLine(
        editor.document.getText(),
        cursorOffset,
        editor.document.languageId,
        cursorPosition.line,
        (line) => getLine(editor.document, line),
        getParserOptions()
    );

    if (missingBrackets) {
        const insertString = missingBrackets + '\n';
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, insertString);
        });
    }
}

function getParserOptions() {
    const config = vscode.workspace.getConfiguration();
    const ignoreAlreadyClosed = config.get<boolean>(
        'closeAnyBracket.ignoreAlreadyClosed'
    );
    return { ignoreAlreadyClosed };
}

function getLine(document: vscode.TextDocument, line: number) {
    return document.lineAt(line).text;
}
