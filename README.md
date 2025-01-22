# Close Any Bracket

[![Latest Release](https://flat.badgen.net/github/tag/cpulvermacher/close-any-bracket)](https://github.com/cpulvermacher/close-any-bracket/tags)
![Installs](https://vsmarketplacebadges.dev/installs-short/cpulvermacher.close-any-bracket.svg)
[![Status](https://flat.badgen.net/github/checks/cpulvermacher/close-any-bracket)](https://github.com/cpulvermacher/close-any-bracket/actions/workflows/node.js.yml)
[![License](https://flat.badgen.net/github/license/cpulvermacher/close-any-bracket)](./LICENSE)


A Visual Studio Code extension to automatically close open braces, brackets, or parentheses in the right order.

![Demo](./images/demo.gif)

You may find this particularly useful with callback-heavy languages or frameworks (e.g. jest, vitest) or in conjunction with Copilot tools that are inconsistent in the amount of context they close at the end of a completion.


## Features

- **Close all open brackets to current indent** - Automatically closes all unclosed `(`, `[`, or `{` at the current line's indentation level or deeper. (Default shortcut: <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd>, Mac: <kbd>Control</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd>)
- **Close last open (, [, or {** - Closes the most recently opened `(`, `[`, or `{` that has not been closed yet. (Default shortcut <kbd>Alt</kbd>+<kbd>]</kbd>, Mac: <kbd>Control</kbd>+<kbd>]</kbd>)
- Detects whether brackets are already closed after the cursor and avoids closing them again. (Configurable using `Close Any Bracket: Ignore Already Closed`, default: enabled)
- Supports close to 300 languages including JavaScript, TypeScript, CSS, JSON, Python, Java, Go, C/C++/C#, HTML (with embedded JavaScript or CSS), Nix, TeX, Awk, JSX, TSX, Vue, Svelte.


## Limitations

- Brackets are inserted at the cursor position without any regard for aesthetics, so this works best if combined with automatic formatting.
- Some nested structures like template strings may not work well, in particular if the syntax is not valid while you're editing.
