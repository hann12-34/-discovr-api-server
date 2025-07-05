/**
 * Import Script for Improved Rogers Arena Events
 * 
 * This script imports events from the improved Rogers Arena scraper to the MongoDB database
 */

const { MongoClient } = require('mongodb');
const RogersArenaEventsImproved = require('./scrapers/cities/vancouver/rogersArenaEventsImproved');

// MongoDB connection string from the README
const uri = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr';

// Database and collection names
const dbName = 'discovr';
const collectionName = 'events';

/**
 * Connect to MongoDB and import events
 */
async function importEvents() {
  console.log('🔄 Starting import for Improved Rogers Arena events...');
  
  // Connect to MongoDB
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to Cloud MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Create scraper instance
    const scraper = new RogersArenaEventsImproved();
    console.log(`📋 Running scraper: ${scraper.name}...`);
    
    // Import stats
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Run the scraper
    const events = await scraper.scrape();
    
    console.log(`✅ Scraped ${events.length} events from ${scraper.name}`);
    
    // Import each event
    for (const event of events) {
      // Check if event already exists (by ID)
      const existingEvent = await collection.findOne({ id: event.id });
      
      if (!existingEvent) {
        // New event - insert it
        await collection.insertOne(event);
        console.log(`➕ Imported new event: ${event.title}`);
        newCount++;
      } else {
        // Event exists - check if it needs to be updated
        const needsUpdate = existingEvent.lastUpdated < event.lastUpdated;
        
        if (needsUpdate) {
          // Update the existing event
          await collection.replaceOne({ id: event.id }, event);
          console.log(`🔄 Updated event: ${event.title}`);
          updatedCount++;
        } else {
          // Skip update
          skippedCount++;
        }
      }
    }
    
    // Print summary
    console.log('\n📊 Import Summary:');
    console.log(`✅ Total events processed: ${events.length}`);
    console.log(`➕ New events imported: ${newCount}`);
    console.log(`🔄 Existing events updated: ${updatedCount}`);
    console.log(`⏭️ Events unchanged/skipped: ${skippedCount}`);
    
  } catch (error) {
    console.error(`❌ Error during import: ${error.message}`);
  } finally {
    // Close the connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the import function
importEvents();
