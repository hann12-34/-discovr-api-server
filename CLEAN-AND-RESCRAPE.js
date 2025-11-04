#!/usr/bin/env node

/**
 * CLEAN AND RESCRAPE - Delete old events and re-run all Vancouver scrapers
 * This will apply all 66 scraper fixes!
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';

console.log('🚀 CLEAN AND RESCRAPE - Applying 66 Scraper Fixes!');
console.log('📦 Connecting to:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

async function cleanAndRescrape() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    // STEP 1: Count old events
    const oldCount = await eventsCollection.countDocuments();
    console.log(`\n📊 Found ${oldCount} OLD events in database`);

    // STEP 2: Delete ALL events
    console.log('\n🗑️  DELETING ALL OLD EVENTS...');
    const deleteResult = await eventsCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} events`);

    // STEP 3: Verify database is empty
    const verifyCount = await eventsCollection.countDocuments();
    console.log(`\n✅ Database is now empty: ${verifyCount} events remaining`);

    if (verifyCount > 0) {
      console.error('⚠️  WARNING: Database not fully cleaned!');
      return;
    }

    console.log('\n🎉 DATABASE CLEANED SUCCESSFULLY!');
    console.log('\n📋 Next steps:');
    console.log('1. Run Vancouver scrapers with: node vancouver-master-scraper.js');
    console.log('2. Or run all scrapers individually');
    console.log('\n✨ All 66 scraper fixes are now ready to apply!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the cleanup
cleanAndRescrape()
  .then(() => {
    console.log('\n✅ CLEANUP COMPLETE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ CLEANUP FAILED:', error);
    process.exit(1);
  });
