# Change Log

## [1.0.0]
- Promoted 0.5.4 to stable release as no significant changes are expected at the moment.

## [0.5.4] (pre-release)
- Automate release process

## [0.5.3] (pre-release)
- Update dependencies

## [0.5.2]
- Add support for Bruno files (.bru)

## [0.5.1]
- Same contents as 0.5.0

## [0.5.0] (pre-release)

- Add support for BibTeX, docker-compose, Cuda C++, Objective C++, jade/pug (partial support), Raku, ShaderLab, Slim, Svelte, and Vue
- For files opened in "Plain Text" language mode, use file extension to choose syntax
- Remove unused syntax files and browser-related code

## [0.4.1]

- Improve description for "Ignore already closed"

## [0.4.0]

- Add new "Ignore already closed" setting (on by default) to avoid closing already closed brackets twice
- (Includes changes from 0.3.0 to 0.3.5)

## [0.3.5] (pre-release)

- Fix for "Ignore already closed" to close brackets in expected order
- Enable "Ignore already closed" setting by default

## [0.3.4] (pre-release)

- Fix closing brackets in the middle of text with "Close to indent" + ignoreAlreadyClosed

## [0.3.2] (pre-release)

- Fix handling of mismatched brackets
- Add experimental configuration option ignoreAlreadyClosed

## [0.3.1] (pre-release)

- Revert: Avoid closing brackets that are already closed after the cursor

## [0.3.0] (pre-release)

- Avoid closing brackets that are already closed after the cursor

## [0.2.4]

- Shouldn't close anything if inside a comment

## [0.2.3]

- Fix support for nested context (e.g. JS/CSS inside HTML)

## [0.2.2]

- Reduce VSIX package size

## [0.2.1]

- Fix support for JSON with Comments filetype

## [0.2.0] (pre-release)

- Add `Close all open brackets to current indent` command

## [0.1.1]

- Add syntax support for ~297 languages

## [0.1.0] (pre-release)

- Add syntax support for ~297 languages

## [0.0.2]

- Change shortcut to `Control+]` on Mac to avoid overlaps with other extensions

## [0.0.1]

- Initial release