/**
 * Import Script for Squamish Beer Festival Events
 * 
 * This script connects to MongoDB and imports events from the Squamish Beer Festival scraper
 */

const { MongoClient } = require('mongodb');
const squamishBeerFestival = require('./scrapers/cities/vancouver/squamishBeerFestival');

// MongoDB connection URI - directly using localhost
const uri = 'mongodb://localhost:27017';

// Database and collection names
const dbName = 'discovr';
const collectionName = 'events';

/**
 * Connect to MongoDB and import events
 */
async function importSquamishBeerFestivalEvents() {
  console.log('🔄 Starting Squamish Beer Festival import process...');
  
  // Connect to MongoDB
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Scrape events
    console.log('🔍 Scraping events from Squamish Beer Festival...');
    const events = await squamishBeerFestival.scrape();
    console.log(`✅ Scraped ${events.length} events`);
    
    // Import stats
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each event
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
    console.log('🔒 MongoDB connection closed');
    console.log('✅ Import process completed');
  }
}

// Run the import function
importSquamishBeerFestivalEvents();
