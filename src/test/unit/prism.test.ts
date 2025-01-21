import { languages } from 'prismjs';
import { describe, expect, it } from 'vitest';

import { getGrammar } from '../../prism';

describe('getGrammar', () => {
    it('returns null for unknown language', () => {
        expect(getGrammar('')).toBe(null);
    });

    it('maps from VSCode language to grammar', () => {
        expect(getGrammar('javascript')).toBe(languages['javascript']);
        expect(getGrammar('javascriptreact')).toBe(languages['jsx']);
        expect(getGrammar('jsonc')).toBe(languages['json']);
        expect(getGrammar('typescript')).toBe(languages['typescript']);
        expect(getGrammar('typescriptreact')).toBe(languages['tsx']);
        expect(getGrammar('objective-c')).toBe(languages['objectivec']);
        expect(getGrammar('shellscript')).toBe(languages['shell']);
    });
});
