#!/bin/bash
# Double-click to start Gallium.
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null 2>&1 || ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=5)?0:1)'; then
  echo "Gallium needs Node.js (version 22.5 or newer)."
  echo "Opening the download page. Install the LTS version, then double-click Start Gallium again."
  open "https://nodejs.org/en/download"
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi
OPEN_BROWSER=1 node --no-warnings server.js
