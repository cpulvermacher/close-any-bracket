import assert from 'assert';
import * as vscode from 'vscode';

const exampleJsFile = `
if (abc) {
    abc.def({
`;

suite('Extension ', () => {
    test('Closes single bracket in current doc', async () => {
        const { waitForNewText } = await openEditor(
            exampleJsFile,
            'javascript',
            3
        );

        await vscode.commands.executeCommand('close-any-bracket.close');

        const text = await waitForNewText;
        assert.strictEqual(text, exampleJsFile + '}');
    });

    test('Closes to indent in current doc', async () => {
        const { waitForNewText } = await openEditor(
            exampleJsFile,
            'javascript',
            3
        );

        await vscode.commands.executeCommand(
            'close-any-bracket.close-to-indent'
        );

        const text = await waitForNewText;
        assert.strictEqual(text, exampleJsFile + '})}\n');
    });

    async function openEditor(
        content: string,
        language: string,
        lineNo: number
    ) {
        const document = await vscode.workspace.openTextDocument({
            content,
            language,
        });
        const position = new vscode.Position(lineNo, 0);
        const selection = new vscode.Selection(position, position);
        const editor = await vscode.window.showTextDocument(document, {
            selection,
        });
        const waitForNewText = waitForTextChange(editor.document);

        return { editor, waitForNewText };
    }

    /**
     * text seems to be updated asynchronuously, so document.getText() may
     * return old text until this event is triggered.
     */
    function waitForTextChange(document: vscode.TextDocument): Promise<string> {
        return new Promise((resolve) => {
            const disposable = vscode.workspace.onDidChangeTextDocument(
                (ev) => {
                    if (ev.document === document) {
                        disposable.dispose();
                        resolve(ev.document.getText());
                    }
                }
            );
        });
    }
});
