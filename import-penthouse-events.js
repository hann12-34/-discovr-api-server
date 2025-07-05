/**
 * Import Penthouse Nightclub Events
 * 
 * This script runs the Penthouse Nightclub scraper and imports events to MongoDB
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { scrape } = require('./scrapers/penthouse-scraper');

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ No MongoDB URI found. Set MONGODB_URI in your .env file.');
  process.exit(1);
}

async function importPenthouseEvents() {
  console.log('📊 Starting Penthouse Nightclub event import...');
  
  let client;
  try {
    console.log(`🔌 Connecting to MongoDB at ${uri.substring(0, 20)}...`);
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovrdb');
    const eventsCollection = db.collection('events');
    
    // Run the Penthouse Nightclub scraper
    console.log('🔍 Running Penthouse Nightclub scraper...');
    const scrapedEvents = await scrape();
    
    console.log(`📋 Found ${scrapedEvents.length} events from Penthouse Nightclub`);
    
    if (scrapedEvents.length === 0) {
      console.log('⚠️ No events found to import.');
      return;
    }
    
    // Check for duplicates and insert new events
    console.log('🔍 Checking for duplicates...');
    let newEventsCount = 0;
    let duplicatesCount = 0;
    
    for (const event of scrapedEvents) {
      // For recurring events, check if the exact same event with same title, date and ID exists
      // This ensures we insert new instances of recurring events with future dates
      const existingEvent = await eventsCollection.findOne({
        id: event.id
      });
      
      if (existingEvent) {
        duplicatesCount++;
        console.log(`♻️ Skipping duplicate: "${event.title}" on ${event.startDate}`);
      } else {
        newEventsCount++;
        await eventsCollection.insertOne(event);
        console.log(`➕ Inserted new event: "${event.title}"`);
      }
    }
    
    console.log(`📋 ${newEventsCount} new events to add (${duplicatesCount} duplicates skipped)`);
    
    if (newEventsCount > 0) {
      console.log(`✅ Successfully inserted ${newEventsCount} events`);
    }
  } catch (error) {
    console.error('❌ Error importing Penthouse Nightclub events:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the import
importPenthouseEvents();
