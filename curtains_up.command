#!/bin/bash
cd "$(dirname "$0")"
echo "🎭 Launching local web server for The Void at http://localhost:8000"
echo "Press ⌃C to stop the show."
python3 -m http.server 8000
