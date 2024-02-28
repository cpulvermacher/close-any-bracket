# Close Any Bracket

[![Latest Release](https://flat.badgen.net/github/tag/cpulvermacher/close-any-bracket)](https://github.com/cpulvermacher/close-any-bracket/tags)
[![Status](https://flat.badgen.net/github/checks/cpulvermacher/close-any-bracket)](https://github.com/cpulvermacher/close-any-bracket/actions/workflows/node.js.yml)
[![License](https://flat.badgen.net/github/license/cpulvermacher/close-any-bracket)](./LICENSE)


A Visual Studio Code extension to automatically close open braces, brackets, or parentheses in the right order.

![Demo](./images/demo.gif)

## Features

- **Close last open (, [, or {** (default shortcut <kbd>Alt</kbd>+<kbd>]</kbd>, Mac: <kbd>Control</kbd>+<kbd>]</kbd>)
- **Close all open brackets to current indent** - Checks the indentation level for the current line and closes all unclosed `(`, `[`, or `{` at this indentation level or deeper. (default shortcut: <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd>, Mac: <kbd>Control</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd>)
- Supports close to 300 languages including JavaScript, TypeScript, CSS, JSON, Python, Java, Go, C/C++/C#, HTML (with embedded JavaScript or CSS).


## Limitations

- Brackets are inserted at the cursor position without any regard for aesthetics, so this works best if combined with automatic formatting.
- Some nested structures like template strings may not work well, in particular if the syntax is not valid while you're editing.
