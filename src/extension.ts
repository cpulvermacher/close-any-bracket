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

    let insertString: string | null;
    try {
        insertString = closeBracket(
            editor.document.getText(),
            cursorOffset,
            editor.document.languageId,
            getExtension(editor.document.fileName),
            getParserOptions(editor)
        );
    } catch (error) {
        showError(error);
        return;
    }

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

    let missingBrackets: string;
    try {
        missingBrackets = closeToIndentAtLine(
            editor.document.getText(),
            cursorOffset,
            editor.document.languageId,
            getExtension(editor.document.fileName),
            cursorPosition.line,
            (line) => getLine(editor.document, line),
            getParserOptions(editor)
        );
    } catch (error) {
        showError(error);
        return;
    }

    if (!missingBrackets) {
        return;
    }

    // the brackets bring their own indentation, so replace the indentation
    // that is already in the line (e.g. added automatically by VSCode).
    // If there is anything else before the cursor, keep the first bracket there.
    const textBeforeCursor = getLine(
        editor.document,
        cursorPosition.line
    ).slice(0, cursorPosition.character);
    const replaceIndent = textBeforeCursor.trim() === '';

    const insertString = replaceIndent
        ? `${missingBrackets}\n`
        : `${missingBrackets.trimStart()}\n`;
    const replaceRange = new vscode.Range(
        replaceIndent
            ? new vscode.Position(cursorPosition.line, 0)
            : cursorPosition,
        cursorPosition
    );

    editor.edit((editBuilder) => {
        editBuilder.replace(replaceRange, insertString);
    });
}

function showError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showWarningMessage(`Close Any Bracket: ${message}`);
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
