#!/bin/bash
# Test Render.com API directly

echo "🔍 Testing Render API..."
echo ""

# Try common Render URLs
URLS=(
  "https://discovr-api-server.onrender.com/api/v1/events?city=Vancouver&limit=2"
  "https://discovr-api.onrender.com/api/v1/events?city=Vancouver&limit=2"
  "https://discovr.onrender.com/api/v1/events?city=Vancouver&limit=2"
)

for url in "${URLS[@]}"; do
  echo "Testing: $url"
  response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS! API is working"
    echo ""
    echo "📦 Response (first event):"
    echo "$body" | jq '.events[0] | {title, venue: .venue.name, imageUrl, image}' 2>/dev/null || echo "$body" | head -c 500
    echo ""
    echo "🔍 Checking for image fields:"
    if echo "$body" | grep -q "imageUrl"; then
      echo "  ✅ Has 'imageUrl' field"
    else
      echo "  ❌ NO 'imageUrl' field"
    fi
    if echo "$body" | grep -q '"image"'; then
      echo "  ✅ Has 'image' field"
    else
      echo "  ❌ NO 'image' field"
    fi
    exit 0
  else
    echo "  ❌ Failed (HTTP $http_code)"
  fi
  echo ""
done

echo "❌ All URLs failed. Please check your Render dashboard for the correct URL."
