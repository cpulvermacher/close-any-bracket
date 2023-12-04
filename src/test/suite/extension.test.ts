import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ClosingBracket, findLastOpenBracket } from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	//TODO proper test
});

suite('findLastOpenBracket', () => {
	const expectCloseWith = (textBeforeCursor: string, closeWith: ClosingBracket | null) => {
		const document = {
			lineAt: (lineNo: number) => {
				assert.strictEqual(lineNo, 0);
				return {
					text: textBeforeCursor
				};
			}
		} as vscode.TextDocument;
		const position = new vscode.Position(0, textBeforeCursor.length);

		assert.strictEqual(findLastOpenBracket(document, position), closeWith);
	};

	test('closes open brackets', () => {
		expectCloseWith('(', ')');
		expectCloseWith('[', ']');
		expectCloseWith('{', '}');
	});

	test('ignores closed brackets', () => {
		expectCloseWith('([{}])', null);
	});

	test('ignores mismatched brackets if closed', () => {
		expectCloseWith('[)]', null);
	});

	test('weird: closes mismatched open brackets', () => {
		expectCloseWith('[(]', ')');
	});

	test('broken: closes mismatched open brackets', () => {
		expectCloseWith('[(]', ')');
	});

	test('broken: closes open brackets within strings', () => {
		expectCloseWith('"{"', '}');
	});
});
