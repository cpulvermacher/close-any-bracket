import { languages } from 'prismjs';
import { describe, expect, it } from 'vitest';

import { getGrammar } from '../../prism';

describe('getGrammar', () => {
    it('returns null for unknown language', () => {
        expect(getGrammar('')).toBe(null);
        expect(getGrammar('1234568')).toBe(null);
    });

    it('maps from VSCode language to grammar', () => {
        expect(getGrammar('bat')).toBe(languages['batch']);
        expect(getGrammar('bibtex')).toBe(languages['tex']);
        expect(getGrammar('cuda-cpp')).toBe(languages['cpp']);
        expect(getGrammar('dockercompose')).toBe(languages['yaml']);
        expect(getGrammar('git-commit')).toBe(languages['git']);
        expect(getGrammar('git-rebase')).toBe(languages['git']);
        expect(getGrammar('jade')).toBe(languages['pug']);
        expect(getGrammar('javascript')).toBe(languages['javascript']);
        expect(getGrammar('javascriptreact')).toBe(languages['jsx']);
        expect(getGrammar('jsonc')).toBe(languages['json']);
        expect(getGrammar('objective-c')).toBe(languages['objectivec']);
        expect(getGrammar('objective-cpp')).toBe(languages['cpp']);
        expect(getGrammar('perl6')).toBe(languages['perl']);
        expect(getGrammar('shellscript')).toBe(languages['shell']);
        expect(getGrammar('slim')).toBe(languages['pug']);
        expect(getGrammar('svelte')).toBe(languages['html']);
        expect(getGrammar('typescript')).toBe(languages['typescript']);
        expect(getGrammar('typescriptreact')).toBe(languages['tsx']);
        expect(getGrammar('Vimscript')).toBe(languages['vim']);
        expect(getGrammar('vue')).toBe(languages['html']);
        expect(getGrammar('vue-html')).toBe(languages['html']);
        expect(getGrammar('xsl')).toBe(languages['xml']);
    });
});
