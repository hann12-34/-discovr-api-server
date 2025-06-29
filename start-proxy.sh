#!/bin/bash

# Start the Discovr Proxy API Server
cd "$(dirname "$0")"
echo "Starting Discovr Proxy API Server..."
node proxy-api-server.js
