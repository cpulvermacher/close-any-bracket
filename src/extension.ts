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
        getExtension(editor.document.fileName),
        getParserOptions(editor)
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
        getExtension(editor.document.fileName),
        cursorPosition.line,
        (line) => getLine(editor.document, line),
        getParserOptions(editor)
    );

    if (missingBrackets) {
        const insertString = missingBrackets + '\n';
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, insertString);
        });
    }
}

function getParserOptions(editor: vscode.TextEditor) {
    const config = vscode.workspace.getConfiguration();
    const ignoreAlreadyClosed = config.get<boolean>(
        'closeAnyBracket.ignoreAlreadyClosed',
        true
    );
    const tabSize =
        typeof editor.options.tabSize === 'number' ? editor.options.tabSize : 4;
    return { ignoreAlreadyClosed, tabSize };
}

function getLine(document: vscode.TextDocument, line: number) {
    return document.lineAt(line).text;
}

function getExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts[parts.length - 1];
}
