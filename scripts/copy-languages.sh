#!/usr/bin/env sh

# Copy PrismJS languages to the out directory.
for f in node_modules/prismjs/components/prism-*.min.js
do
    # via https://github.com/PrismJS/prism/blob/master/gulpfile.js/paths.js, the main prismjs bundle
    # already includes the following language files, let's skip them
    case "$f" in
        *prism-core.min.js) continue ;;
        *prism-markup.min.js) continue ;;
        *prism-css.min.js) continue ;;
        *prism-clike.min.js) continue ;;
        *prism-javascript.min.js) continue ;;
    esac
    cp "$f" "out/$(basename "${f%.min.*}").js"
done

# check we have the expected number of language definitions
EXPECTED_COUNT=293
ACTUAL_COUNT=$(ls out/prism-*.js | wc -l)
if [ "$ACTUAL_COUNT" != "$EXPECTED_COUNT" ]; then
    echo "Error: Expected $EXPECTED_COUNT prism language definitions in out/, but found $ACTUAL_COUNT"
    exit 1
fi