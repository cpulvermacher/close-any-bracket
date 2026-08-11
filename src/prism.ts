//disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)
global.Prism = global.Prism || {};
global.Prism.manual = true;

import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index';

export function tokenize(
    text: string,
    languageId: string,
    fileExtension: string
): Prism.TokenStream {
    return Prism.tokenize(text, getGrammar(languageId, fileExtension));
}

/**
 * Maps VSCode language identifiers (https://code.visualstudio.com/docs/languages/identifiers)
 * to Grammar (https://prismjs.com/#supported-languages).
 * Note that the list of identifiers for VSCode is not exhaustive and maybe outdated, it's best to test file types in question.
 *
 * If there is no grammar for the language, falls back to `clike`, which gets
 * brackets, strings and comments right for most of the languages Prism doesn't
 * know about.
 */
export function getGrammar(
    languageId: string,
    fileExtension?: string
): Prism.Grammar {
    let grammarId: string;
    switch (languageId) {
        case 'bat':
            grammarId = 'batch';
            break;
        case 'bibtex':
            grammarId = 'tex';
            break;
        case 'cuda-cpp':
            grammarId = 'cpp';
            break;
        case 'dockercompose':
            grammarId = 'yaml';
            break;
        case 'git-commit':
        case 'git-rebase':
            grammarId = 'git';
            break;
        case 'jade':
            grammarId = 'pug';
            break;
        case 'javascriptreact':
            grammarId = 'jsx';
            break;
        case 'jsonc': // JSON with comments
            grammarId = 'json';
            break;
        case 'objective-c':
            grammarId = 'objectivec';
            break;
        case 'objective-cpp':
            grammarId = 'cpp';
            break;
        case 'perl6':
        case 'raku':
            grammarId = 'perl';
            break;
        case 'shaderlab':
            grammarId = 'clike';
            break;
        case 'shellscript':
            grammarId = 'shell';
            break;
        case 'slim':
            grammarId = 'pug';
            break;
        case 'svelte':
            grammarId = 'html';
            break;
        case 'terraform':
            grammarId = 'hcl';
            break;
        case 'typescriptreact':
            grammarId = 'tsx';
            break;
        case 'Vimscript':
            grammarId = 'vim';
            break;
        case 'vue':
        case 'vue-html':
            grammarId = 'html';
            break;
        case 'xsl':
            grammarId = 'xml';
            break;
        default:
            grammarId = languageId;
            break;
    }

    const plaintextIds = ['plaintext', 'text', 'txt'];
    if (plaintextIds.includes(languageId) && fileExtension) {
        // plaintext is not going to be helpful, use the file extension instead
        switch (fileExtension) {
            case 'sqf':
                grammarId = 'clike';
                break;
            case 'bru': // Bruno files
                grammarId = 'javascript';
                break;
            default:
                grammarId = fileExtension;
                break;
        }
    }

    if (grammarId && !(grammarId in Prism.languages)) {
        console.log(`Trying to load grammar for ${grammarId}...`);
        try {
            loadLanguages(grammarId);
        } catch (error) {
            console.log(`Failed to load grammar for ${grammarId}: ${error}`);
        }
    }

    const grammar = Prism.languages[grammarId];
    if (grammar) {
        return grammar;
    }

    console.log(
        `No grammar for language ${languageId}, file extension ${fileExtension}, falling back to clike`
    );
    return Prism.languages.clike;
}
