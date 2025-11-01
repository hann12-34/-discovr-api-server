#!/bin/bash

# Add Node.js to PATH
export PATH="$HOME/.local/node/bin:$PATH"

# Start the API server in development mode
echo "🚀 Starting Discovr API Server..."
echo "Server will be available at: http://localhost:3000"
echo ""
npm run dev
