# Close Any Bracket

A Visual Studio Code extension adding the following commands:

- `Close last open (, [, or {` closes the last open parenthesis, brace, or bracket. (default shortcut `Alt+]`, Mac: `Control+]`)
- `Close all open brackets to current indent` checks the indentation level for the current line and closes all unclosed `(, [, {` at this indentation level or deeper. (default shortcut: `Alt+Shift+Enter`, Mac: `Control+Shift+Enter`)

Supports syntax for close to 300 languages, using Visual Studio Code's language mode for the current document.

## Limitations

- If _inside_ a string or comment, may close brackets opened in string (even if these don't mean anything in the language).
- Some deeply nested structures in some languages may not be supported (e.g. brace inside a string interpolation inside a template string)
