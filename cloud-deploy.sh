#!/bin/bash
# Script to deploy Discovr API to Cloud Run with fixed configuration

# Use hardcoded MongoDB URI for cloud deployment
# The correct URI is set based on the .env configuration
MONGODB_URI="mongodb+srv://masteraccount:masteraccount123@discovr.vzlnmqb.mongodb.net/discovr-events?retryWrites=true&w=majority"

echo "Deploying Discovr API to Cloud Run with provided MongoDB URI..."


# Deploy with proper health check settings and startup timeout
gcloud run deploy discovr-api \
  --source . \
  --region us-west1 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --concurrency 80 \
  --timeout 300s \
  --set-env-vars="NODE_ENV=production,ENABLE_SCRAPERS=true,MONGODB_URI=$MONGODB_URI" \
  --no-cpu-throttling \
  --port 8080 \
  --allow-unauthenticated

echo "Deployment completed. Check status with:"
echo "gcloud run services describe discovr-api --region us-west1"
