#!/bin/bash

# Script to push all fixes directly to main branch on GitHub
COMMIT_MESSAGE="Fix admin dashboard buttons and Puppeteer Chrome not found errors"

# Display the current branch
echo "Current branch: $(git branch --show-current)"

# Add all changed files
git add .

# Commit changes
git commit -m "$COMMIT_MESSAGE"

# Push to GitHub main branch
git push origin main

echo "Changes pushed to GitHub main branch. Deployment should be triggered automatically on Render.com."
echo "Visit your Render.com dashboard to monitor the deployment status."
