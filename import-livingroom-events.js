/**
 * Script to import events from The Living Room Vancouver
 * This script runs the scraper and imports the events to the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { scrape } = require('./scrapers/livingroom-scraper');
const Event = require('./models/Event'); // Adjust if your model path is different

async function importEvents() {
  console.log('📊 Starting The Living Room Vancouver event import...');
  
  try {
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB at ${process.env.MONGODB_URI.substring(0, 20)}...`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Run the scraper
    console.log('🔍 Running The Living Room Vancouver scraper...');
    const scrapedEvents = await scrape();
    
    // Check if any events were found
    console.log(`📋 Found ${scrapedEvents.length} events from The Living Room Vancouver`);
    
    if (scrapedEvents.length === 0) {
      console.log('No events found to import.');
      return;
    }
    
    // Check for duplicates and insert new events
    console.log('🔍 Checking for duplicates...');
    let newCount = 0;
    let duplicateCount = 0;
    
    for (const event of scrapedEvents) {
      // Check if the event already exists by ID
      const existingEvent = await Event.findOne({ id: event.id });
      
      if (!existingEvent) {
        // This is a new event, insert it
        await Event.create(event);
        console.log(`➕ Inserted new event: "${event.title}"`);
        newCount++;
      } else {
        // This is a duplicate, skip it
        console.log(`♻️ Skipping duplicate event: "${event.title}"`);
        duplicateCount++;
      }
    }
    
    console.log(`📋 ${newCount} new events to add (${duplicateCount} duplicates skipped)`);
    console.log(`✅ Successfully inserted ${newCount} events`);
    
  } catch (error) {
    console.error(`❌ Error importing Living Room Vancouver events: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the import function
importEvents();
