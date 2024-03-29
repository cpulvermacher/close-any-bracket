import * as vscode from 'vscode';
import { closeBracket, closeToIndentAtLine } from './brackets';

export function deactivate() {
    /* nothing to do here */
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const close = vscode.commands.registerCommand(
        'close-any-bracket.close',
        () => {
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
    );

    const closeToIndent = vscode.commands.registerCommand(
        'close-any-bracket.close-to-indent',
        () => {
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
    );

    context.subscriptions.push(close, closeToIndent);
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
