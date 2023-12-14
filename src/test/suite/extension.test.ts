import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ClosingBracket, getBracketToInsert } from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	//TODO proper test
});

suite('getBracketToInsert', () => {
	test('closes open brackets', () => {
		assert.strictEqual(getBracketToInsert('(', 1, 'javascript'), ')');
		assert.strictEqual(getBracketToInsert('{', 1, 'javascript'), ')');
		assert.strictEqual(getBracketToInsert('[', 1, 'javascript'), ')');
	});

	test('ignores closed brackets', () => {
		assert.strictEqual(getBracketToInsert('([{}])', 0, 'javascript'), null);
	});

	test('ignores mismatched brackets if closed', () => {
		assert.strictEqual(getBracketToInsert('[)]', 3, 'javascript'), ')');
	});

	test('weird: closes mismatched open brackets', () => {
		assert.strictEqual(getBracketToInsert('[(]', 3, 'javascript'), ')');
	});


	test('broken: closes open brackets within strings', () => {
		assert.strictEqual(getBracketToInsert('"{"', 3, 'javascript'), null);
	});
});
