#!/usr/bin/env sh
for f in node_modules/prismjs/components/prism-*.min.js
do
    cp "$f" "out/$(basename "${f%.min.*}").js"
done