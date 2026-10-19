#!/bin/sh
cd "$(dirname "$0")"
OPEN_BROWSER=1 exec node --no-warnings server.js
