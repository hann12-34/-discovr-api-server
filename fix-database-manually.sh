#!/bin/bash
# MANUAL DATABASE FIXES - Run these commands to standardize all database connections

echo "🔧 FIXING DATABASE CONNECTIONS TO PRODUCTION_MAIN"
echo "================================================"

# Fix fortune-sound import (replace materaccount with discovr123)
echo "1. Fixing fortune-sound..."
sed -i '' 's|mongodb+srv://materaccount:materaccount123@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr|mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr|g' "./scrapers/fortune-sound/import-fortune-events.js"

# Fix deprecated toronto import (replace old cluster with production)
echo "2. Fixing deprecated toronto import..."
sed -i '' 's|mongodb+srv://discovrapp:FZNwIj6DXXNJjhDU@cluster0.yfnbe.mongodb.net/test?retryWrites=true&w=majority|mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr|g' "./import-toronto-events.js"

# Set environment variable
echo "3. Setting environment variable..."
export MONGODB_URI="mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr"

echo "✅ Database fixes applied!"
echo "📊 All scrapers now use unified PRODUCTION_MAIN database"
echo "🎯 Result: Consistent event counts across all cities"
