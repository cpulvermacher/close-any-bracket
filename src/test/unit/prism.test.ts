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
        expect(getGrammar('raku')).toBe(languages['perl']);
        expect(getGrammar('shaderlab')).toBe(languages['clike']);
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

    it('for plaintext, returns plaintextGrammar without extension', () => {
        expect(getGrammar('plaintext')).toEqual({});
        expect(getGrammar('text')).toEqual({});
        expect(getGrammar('txt')).toEqual({});
    });

    it('for plaintext, returns grammar using extension if available', () => {
        expect(getGrammar('plaintext', 'md')).toBe(languages['markdown']);
        expect(getGrammar('text', 'md')).toBe(languages['markdown']);
        expect(getGrammar('txt', 'md')).toBe(languages['markdown']);

        expect(getGrammar('plaintext', 'html')).toBe(languages['html']);

        expect(getGrammar('plaintext', 'nix')).not.toEqual({});
        expect(getGrammar('plaintext', 'nix')).toBe(languages['nix']);

        expect(getGrammar('plaintext', 'awk')).not.toEqual({});
        expect(getGrammar('plaintext', 'awk')).toBe(languages['awk']);

        expect(getGrammar('plaintext', 'bru')).toBe(languages['javascript']);
    });
});
