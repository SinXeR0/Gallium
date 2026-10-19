#!/usr/bin/env bash
# Rebuilds docs/ (the free GitHub Pages preview) from public/ + preview/mock-api.js.
set -euo pipefail
cd "$(dirname "$0")/.."
cp public/app.js public/app.css public/manifest.webmanifest docs/
rm -rf docs/icons && cp -r public/icons docs/icons
cp preview/mock-api.js docs/mock-api.js
sed 's#<script src="app.js"></script>#<script src="mock-api.js"></script>\n  <script src="app.js"></script>#' public/index.html > docs/index.html
touch docs/.nojekyll
echo "docs/ rebuilt"
