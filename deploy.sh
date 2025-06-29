#!/bin/bash
# Simple script to deploy changes to Google Cloud Run

echo "Starting deployment to Google Cloud Run..."

# Ensure gcloud is configured
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

# Build and deploy to Cloud Run
echo "Building and deploying to Cloud Run..."
gcloud run deploy discovr-api \
    --source . \
    --platform managed \
    --region us-west1 \
    --allow-unauthenticated

echo "Deployment completed. Your changes should be live in a few minutes."
