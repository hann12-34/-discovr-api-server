#!/bin/bash
# Script to deploy to Cloud Run with proper configuration

# Set environment variables for deployment (without exposing them in the script)
echo "Deploying to Cloud Run with configured environment variables..."

# Deploy with environment variables set securely through the gcloud command
gcloud run deploy discovr-api \
  --source . \
  --region us-west1 \
  --set-env-vars="NODE_ENV=production,ENABLE_SCRAPERS=false,SCHEDULED_DIAGNOSTICS=false" \
  --allow-unauthenticated

echo "Deployment completed. Use the Cloud Console to add secure environment variables like MONGODB_URI."
