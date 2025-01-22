//disable automatic highlighting (we have no document where that could happen, but let's do it for good measure)
global.Prism = global.Prism || {};
global.Prism.manual = true;

import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index';

export function tokenize(
    text: string,
    languageId: string,
    fileExtension: string
): Prism.TokenStream | null {
    const grammar = getGrammar(languageId, fileExtension);
    if (!grammar) {
        console.log(
            `Couldn't find grammar for language ${languageId}, file extension ${fileExtension}`
        );
        return null;
    }

    return Prism.tokenize(text, grammar);
}

/**
 * Maps VSCode language identifiers (https://code.visualstudio.com/docs/languages/identifiers)
 * to Grammar (https://prismjs.com/#supported-languages) or null if not found
 */
export function getGrammar(
    languageId: string,
    fileExtension?: string
): Prism.Grammar | null {
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
            grammarId = 'perl';
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
        grammarId = fileExtension;
    }

    if (!(grammarId in Prism.languages)) {
        console.log(`Trying to load grammar for ${grammarId}...`);
        loadLanguages(grammarId);
    }

    return Prism.languages[grammarId] || null;
}
