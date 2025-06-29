#!/bin/bash
# Deployment script for Discovr API with Vancouver scrapers using Artifact Registry

echo "🚀 Preparing to deploy Vancouver scrapers to Cloud Run..."

# Set environment variables
PROJECT_ID="discovr-463500"
SERVICE_NAME="discovr-api-test"
REGION="northamerica-northeast2"
REPOSITORY="discovr-images"
IMAGE_NAME="discovr-api"
TAG="vancouver-$(date +%Y%m%d-%H%M%S)"
FULL_IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${TAG}"

echo "💡 Using Artifact Registry for image storage"

# Ensure Artifact Registry repository exists
echo "🔧 Setting up Artifact Registry repository..."
gcloud artifacts repositories describe $REPOSITORY \
  --project=$PROJECT_ID \
  --location=$REGION > /dev/null 2>&1 || \
gcloud artifacts repositories create $REPOSITORY \
  --project=$PROJECT_ID \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker repository for Vancouver scrapers"

# Configure Docker to use Google Cloud as credential helper
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build the Docker image
echo "📦 Building Docker image: $FULL_IMAGE_URL"

# Build the Docker image
docker build -t $FULL_IMAGE_URL .
if [ $? -ne 0 ]; then
  echo "❌ Docker build failed, trying with Cloud Build instead"
  gcloud builds submit --tag=$FULL_IMAGE_URL .
  if [ $? -ne 0 ]; then
    echo "❌ Both Docker and Cloud Build failed"
    exit 1
  fi
else
  echo "✅ Docker image built successfully"

  # Push the image to Google Artifact Registry
  echo "☁️ Pushing image to Google Artifact Registry..."
  docker push $FULL_IMAGE_URL
  if [ $? -ne 0 ]; then
    echo "❌ Failed to push image to Artifact Registry"
    exit 1
  fi

  echo "✅ Image pushed successfully"
fi

# Use the existing service URL for Discovr API
FIXED_SERVICE_URL="https://discovr-api-test-531591199325.northamerica-northeast2.run.app"
echo "🔍 Using the existing service URL: $FIXED_SERVICE_URL"

# Handle MongoDB URI credentials
echo "🔑 MongoDB authentication is required for the Fox Cabaret scraper"

# Check if MongoDB URI environment variable is set
if [ -z "$MONGODB_URI" ]; then
  # Prompt for MongoDB credentials
  echo "Enter your MongoDB username:"
  read -p "> " MONGODB_USERNAME
  echo "Enter your MongoDB password:"
  read -s -p "> " MONGODB_PASSWORD
  echo "\n"
  
  # Use the same cluster and database name from before
  MONGODB_CLUSTER="discovr.vzlnmqb.mongodb.net"
  MONGODB_DATABASE="discovr"
  
  # Construct MongoDB URI with provided credentials
  MONGODB_URI="mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/${MONGODB_DATABASE}?retryWrites=true&w=majority&appName=Discovr"
  echo "💬 Using MongoDB credentials provided by user"
else
  echo "💬 Using existing MONGODB_URI from environment"
fi

# Display MongoDB connection status
echo "👁 Using MongoDB URI: ${MONGODB_URI:0:20}...[truncated for security]"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."

# Combine all environment variables
ENV_VARS="MONGODB_URI=${MONGODB_URI},NODE_ENV=production,SCRAPER_API_KEY=${SCRAPER_API_KEY:-},MEETUP_API_KEY=${MEETUP_API_KEY:-},EVENTBRITE_API_KEY=${EVENTBRITE_API_KEY:-}"

# Deploy to Cloud Run with fixed service name and all combined environment variables
gcloud run deploy $SERVICE_NAME \
  --image $FULL_IMAGE_URL \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --port 8080 \
  --update-env-vars="$ENV_VARS"

# After deployment, check if our scraper endpoint is available
echo "🕐 Waiting for deployment to stabilize..."
sleep 10

# After deployment, run the Fox Cabaret scraper immediately
echo "📞 Triggering Fox Cabaret scraper after deployment..."
curl -X POST "$FIXED_SERVICE_URL/api/v1/admin/scrape?venue=foxcabaret" || echo "⚠️ Failed to trigger scraper, but deployment should be successful"

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed"
  exit 1
fi

# Get the URL of the deployed service
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "✅ Deployment successful!"
echo "🌐 Service URL: $SERVICE_URL"
echo "API Endpoints:"
echo "  Health check: $SERVICE_URL/api/v1/health"
echo "  Events: $SERVICE_URL/api/v1/venues/events/all"

echo "⚠️ Make sure your iOS app is using this URL: $SERVICE_URL/api/v1"
