#!/bin/bash

# 🚨 CLEAN DATABASE AND RE-IMPORT WITH FIXED SCRAPERS
# This script will:
# 1. Delete ALL old events from database
# 2. Re-import with FIXED scrapers (no duplicates, no bad dates)
# 3. Give you clean data

echo "═══════════════════════════════════════════"
echo "🧹 CLEANING DATABASE AND RE-IMPORTING"
echo "═══════════════════════════════════════════"
echo ""

# Step 1: Delete old data
echo "🗑️  Step 1: Deleting old events from database..."
node -e "
const { MongoClient } = require('mongodb');
const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('discovr');
  const result = await db.collection('events').deleteMany({});
  console.log('✅ Deleted', result.deletedCount, 'old events');
  await client.close();
})();
"

echo ""
echo "═══════════════════════════════════════════"
echo "📥 Step 2: Re-importing with FIXED scrapers..."
echo "═══════════════════════════════════════════"
echo ""

# Step 2: Re-import each city
echo "📍 Importing New York..."
node ImportFiles/import-all-new-york-events.js

echo ""
echo "📍 Importing Toronto..."
node ImportFiles/import-all-toronto-events.js

echo ""
echo "📍 Importing Vancouver..."
node ImportFiles/import-all-vancouver-events.js

echo ""
echo "📍 Importing Calgary..."
node ImportFiles/import-all-calgary-events.js

echo ""
echo "📍 Importing Montreal..."
node ImportFiles/import-all-montreal-events.js

echo ""
echo "═══════════════════════════════════════════"
echo "✅ DONE! Database cleaned and re-imported"
echo "═══════════════════════════════════════════"
echo ""
echo "🎯 Next steps:"
echo "   1. Restart your API server (npm start)"
echo "   2. Force-close and reopen your app"
echo "   3. Pull down to refresh"
echo ""
echo "Expected results:"
echo "   ✅ Zero duplicates"
echo "   ✅ Real dates (not all 'today')"
echo "   ✅ No junk events"
echo ""
