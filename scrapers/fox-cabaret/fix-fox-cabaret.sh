#!/bin/bash

# Script to fix the Fox Cabaret scraper with the correct MongoDB connection

# Default MongoDB Atlas cluster information
echo "🔍 Discovering correct MongoDB Atlas information..."

# User input for MongoDB information
echo "Please enter your MongoDB Atlas cluster hostname (example: cluster0.mongodb.net)"
echo "This is the part after @ and before / in your MongoDB connection string"
read -p "> " MONGODB_CLUSTER

echo "Please enter your MongoDB Atlas username:"
read -p "> " MONGODB_USERNAME

echo "Please enter your MongoDB Atlas password:"
read -s -p "> " MONGODB_PASSWORD
echo ""

echo "Please enter your MongoDB Atlas database name (default: discovr):"
read -p "> " MONGODB_DATABASE
MONGODB_DATABASE=${MONGODB_DATABASE:-discovr}

# Construct the MongoDB URI
MONGODB_URI="mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/${MONGODB_DATABASE}?retryWrites=true&w=majority&appName=Discovr"

# Service name for Cloud Run
SERVICE_NAME="discovr-api-test"

# Display MongoDB connection status (masked)
MASKED_URI=$(echo "$MONGODB_URI" | sed 's/:[^:@]*@/:*****@/')
echo "👁 Using MongoDB URI: $MASKED_URI"

# Test DNS resolution
echo "🔄 Testing DNS resolution for $MONGODB_CLUSTER..."
if host "$MONGODB_CLUSTER" > /dev/null; then
  echo "✅ DNS resolution successful for $MONGODB_CLUSTER"
else
  echo "⚠️ Warning: Could not resolve $MONGODB_CLUSTER. This might be a network or DNS issue."
  echo "Continuing with deployment anyway..."
fi

# Deploy to Cloud Run with the MongoDB URI
echo "🚀 Deploying to Cloud Run with fixed MongoDB connection..."

gcloud run deploy $SERVICE_NAME \
  --image northamerica-northeast2-docker.pkg.dev/discovr-463500/discovr-images/discovr-api:vancouver-latest \
  --platform managed \
  --region northamerica-northeast2 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,MONGODB_URI=$MONGODB_URI"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --platform managed \
  --region northamerica-northeast2 \
  --format='value(status.url)')

echo "⏳ Waiting for deployment to stabilize..."
sleep 10

# Check MongoDB connection status
echo "📊 Checking MongoDB connection status..."
curl -s "${SERVICE_URL}/api/v1/debug/mongodb" | jq .

# Trigger the Fox Cabaret scraper
echo "🔍 Triggering Fox Cabaret scraper..."
curl -X POST "${SERVICE_URL}/api/v1/admin/scrape?venue=foxcabaret"

echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo "📝 Test your connection at: $SERVICE_URL/api/v1/debug/mongodb"
echo "📱 Make sure your iOS app is using this URL: $SERVICE_URL/api/v1"
