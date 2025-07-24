/**
 * Toronto Event Scrapers Master Import Script
 * 
 * This script runs the comprehensive Toronto master scraper that includes
 * all 44 venues (cultural venues + nightlife venues) and imports their 
 * events into the MongoDB database.
 * 
 * Usage: node import-all-toronto-events.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const colors = require('colors');

// Import the master Toronto scraper
const { scrapeAllTorontoEvents } = require('../scrapers/cities/Toronto/scrape-all-toronto');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not defined!'.red);
  console.error('Please make sure your .env file contains the correct MongoDB connection string.'.yellow);
  process.exit(1);
}

async function importAllTorontoEvents() {
  const startTime = Date.now();
  console.log('🚀 Starting Toronto events import process...'.cyan.bold);
  console.log(`Using MongoDB URI: ${MONGODB_URI.substring(0, 20)}...`.gray);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...'.yellow);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!'.green);
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Run the master Toronto scraper
    console.log('\n🔍 Running comprehensive Toronto scraper...'.cyan);
    console.log('This will scrape all 44 Toronto venues (cultural + nightlife)'.gray);
    
    const totalAdded = await scrapeAllTorontoEvents();
    
    // Get final counts
    const totalEvents = await eventsCollection.countDocuments({});
    const torontoEvents = await eventsCollection.countDocuments({
      $or: [
        { title: { $regex: /^Toronto - / } },
        { 'venue.city': 'Toronto' },
        { source: { $regex: /Toronto/i } }
      ]
    });
    
    // Log summary
    const totalDuration = (Date.now() - startTime) / 1000;
    console.log('\n' + '='.repeat(60).blue);
    console.log('📊 TORONTO IMPORT SUMMARY:'.yellow.bold);
    console.log(`✅ Events added this run: ${totalAdded}`.green);
    console.log(`✅ Total Toronto events in database: ${torontoEvents}`.green);
    console.log(`✅ Total events in database: ${totalEvents}`.green);
    console.log(`✅ Import process took ${totalDuration.toFixed(2)} seconds`.green);
    
    console.log('\n📍 Toronto Venues Covered:'.cyan.bold);
    console.log('   Cultural Venues: 25+ venues'.gray);
    console.log('   Nightlife Venues: 19+ venues'.gray);
    console.log('   Total Coverage: 44+ venues'.gray);
    
    console.log('\nNext Steps:'.cyan);
    console.log('1. Test your API locally:'.yellow);
    console.log('   node unified-proxy-server.js'.gray);
    console.log('2. Deploy to production to update the live API'.yellow);
    console.log('='.repeat(60).blue + '\n');
    
  } catch (error) {
    console.error('❌ Error during Toronto import:'.red);
    console.error(error.message);
    console.error(error.stack);
  } finally {
    // Close MongoDB connection
    await client.close();
    console.log('MongoDB connection closed.'.gray);
  }
}

// Run the import process
importAllTorontoEvents().catch(err => {
  console.error('❌ Unhandled error in importAllTorontoEvents:'.red);
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
