#!/usr/bin/env sh
set -e

# Copy PrismJS languages to the out directory.
# Note that while vsce warns about performance issues with a large number of files, we typically only
# load a single language when activating the extension.
# If bundled together, we would need to load a single 600KB file when activating the extension,
# which introduces a very noticeable delay when using keybindings.
for f in node_modules/prismjs/components/prism-*.min.js
do
    case "$f" in
        # via https://github.com/PrismJS/prism/blob/master/gulpfile.js/paths.js, the main prismjs bundle
        # already includes the following language files, let's skip them
        *prism-core.min.js) continue ;;
        *prism-markup.min.js) continue ;;
        *prism-css.min.js) continue ;;
        *prism-clike.min.js) continue ;;
        *prism-javascript.min.js) continue ;;

        # skip some large languages that don't make sense to include
        *prism-apacheconf.min.js) continue ;; # no useful tokens
        *prism-sqf.min.js) continue ;; # `clike` works just fine
    esac
    cp --no-preserve=mode "$f" "out/$(basename "${f%.min.*}").js"
done

# check we have the expected number of language definitions
EXPECTED_COUNT=291
ACTUAL_COUNT=$(ls out/prism-*.js | wc -l)
if [ "$ACTUAL_COUNT" != "$EXPECTED_COUNT" ]; then
    echo "Error: Expected $EXPECTED_COUNT prism language definitions in out/, but found $ACTUAL_COUNT"
    exit 1
fi