#!/usr/bin/env bash
# Rebuilds docs/ (the free GitHub Pages preview) from public/ + preview/mock-api.js.
set -euo pipefail
cd "$(dirname "$0")/.."
cp public/app.js public/app.css public/emoji.js public/manifest.webmanifest docs/
rm -rf docs/icons && cp -r public/icons docs/icons
cp preview/mock-api.js docs/mock-api.js
# A version stamp on each file makes phones fetch the new copy instead of an old saved one.
V=$(date +%s)
sed -e "s#<script src=\"app.js\"></script>#<script src=\"mock-api.js?v=$V\"></script>\n  <script src=\"app.js?v=$V\"></script>#" \
    -e "s#href=\"app.css\"#href=\"app.css?v=$V\"#" public/index.html > docs/index.html
sed -i "s#sc.src = 'emoji.js'#sc.src = 'emoji.js?v=$V'#" docs/app.js
touch docs/.nojekyll
echo "docs/ rebuilt"
