/**
 * Import script for Orpheum Theatre events
 * 
 * This script runs the Orpheum Theatre scraper and imports the events into MongoDB
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { scrape } = require('./scrapers/orpheum-scraper');

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function importEvents() {
  console.log('📊 Starting Orpheum Theatre event import...');
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB at ${uri.substring(0, 20)}...`);
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Get database and collection
    const db = client.db();
    const eventsCollection = db.collection('events');
    
    // Run the Orpheum Theatre scraper
    console.log('🔍 Running Orpheum Theatre scraper...');
    const scrapedEvents = await scrape();
    console.log(`📋 Found ${scrapedEvents.length} events from Orpheum Theatre`);
    
    // Check for duplicates and insert new events
    console.log('🔍 Checking for duplicates...');
    let newEventsCount = 0;
    let duplicatesCount = 0;
    
    for (const event of scrapedEvents) {
      // For recurring events, check if the exact same event with same ID exists
      // This ensures we insert new instances of recurring events with future dates
      const existingEvent = await eventsCollection.findOne({
        id: event.id
      });
      
      if (existingEvent) {
        console.log(`♻️ Skipping duplicate: "${event.title}" on ${event.startDate}`);
        duplicatesCount++;
      } else {
        await eventsCollection.insertOne(event);
        console.log(`➕ Inserted new event: "${event.title}"`);
        newEventsCount++;
      }
    }
    
    console.log(`📋 ${newEventsCount} new events to add (${duplicatesCount} duplicates skipped)`);
    
    if (newEventsCount > 0) {
      console.log(`✅ Successfully inserted ${newEventsCount} events`);
    }
    
  } catch (error) {
    console.error(`❌ Error importing events: ${error.message}`);
    console.error(error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the import function
importEvents().catch(console.error);
