#!/bin/bash
cd "$(dirname "$0")"  # Move to the directory of this script

# Prompt for commit message
echo "🎭  Enter your commit message: "
read commit_message

# Stage, commit, push
echo "🎬  Adding and committing all changes..."
git add .
git commit -m "$commit_message"

# Optional: if you use main instead of master, change below
git push origin main

echo "🌟  All changes pushed to GitHub successfully!"
echo "Press any key to close..."
read -n 1 -s
