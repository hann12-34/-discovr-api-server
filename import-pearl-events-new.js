/**
 * Import script for The Pearl Vancouver events
 * Uses the improved Pearl scraper that focuses only on actual events
 */

// Import required modules
const { MongoClient } = require('mongodb');
const pearlScraper = require('./scrapers/pearl-scraper-new');

// MongoDB connection string - use environment variable or default
const uri = process.env.MONGODB_URI || 'mongodb+srv://discoverify:praTEpRabrAm@cluster0.qvibdtt.mongodb.net/discovr?retryWrites=true&w=majority';

async function importEvents() {
  console.log('📊 Starting The Pearl Vancouver event import...');
  
  // Create MongoDB client
  const client = new MongoClient(uri);
  
  try {
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB at ${uri.substring(0, 15)}...`);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Get database and events collection
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Run the Pearl Vancouver scraper
    console.log('🔍 Running The Pearl Vancouver scraper...');
    const events = await pearlScraper.scrape();
    
    if (!events || events.length === 0) {
      console.log('No events found for The Pearl Vancouver');
      return;
    }
    
    console.log(`📋 Found ${events.length} events from The Pearl Vancouver`);
    
    // Check for duplicates and insert new events
    console.log('🔍 Checking for duplicates...');
    
    let insertedCount = 0;
    const processedUrls = new Set();
    
    for (const event of events) {
      // Skip if already processed in this batch
      const eventDateStr = event.startDate ? event.startDate.toISOString().split('T')[0] : 'unknown-date';
      const dedupeKey = `${event.sourceURL}-${event.title}-${eventDateStr}`;
      
      if (processedUrls.has(dedupeKey)) {
        console.log(`♻️ Skipping duplicate event: "${event.title}"`);
        continue;
      }
      
      processedUrls.add(dedupeKey);
      
      // Check if this event already exists in the database
      const existing = await eventsCollection.findOne({
        sourceURL: event.sourceURL,
        title: event.title
      });
      
      if (!existing) {
        // Insert the new event
        await eventsCollection.insertOne(event);
        console.log(`➕ Inserted new event: "${event.title}"`);
        insertedCount++;
      } else {
        console.log(`♻️ Skipped existing event: "${event.title}"`);
      }
    }
    
    console.log(`📋 ${insertedCount} new events to add (${events.length - insertedCount} duplicates skipped)`);
    console.log(`✅ Successfully inserted ${insertedCount} events`);
  } catch (err) {
    console.error('❌ Error importing events:', err);
  } finally {
    // Close the MongoDB connection
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the import
importEvents().catch(console.error);
