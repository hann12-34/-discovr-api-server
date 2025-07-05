/**
 * Import Script for Canada Place Events
 * 
 * This script imports events from the Canada Place scraper to the MongoDB database
 */

const { MongoClient } = require('mongodb');
const CanadaPlaceEvents = require('./scrapers/cities/vancouver/canadaPlaceEvents');

// MongoDB connection string from the README
const uri = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr';

// Database and collection names
const dbName = 'discovr';
const collectionName = 'events';

/**
 * Connect to MongoDB and import events
 * @param {boolean} skipDbConnection - Skip DB connection for testing purposes
 * @returns {Promise<Array>} - Array of events
 */
async function importEvents(skipDbConnection = false) {
  console.log('🔄 Starting import for Canada Place events...');
  
  let client;
  let collection;
  
  if (!skipDbConnection) {
    // Connect to MongoDB
    client = new MongoClient(uri);
    
    try {
      await client.connect();
      console.log('✅ Connected to Cloud MongoDB');
      
      const db = client.db(dbName);
      collection = db.collection(collectionName);
    } catch (error) {
      console.error(`❌ Error connecting to MongoDB: ${error.message}`);
      return [];
    }
  } else {
    console.log('⚠️ Skipping DB connection (test mode)');
  }
  
  try {
    // Create scraper instance
    const scraper = new CanadaPlaceEvents();
    console.log(`📋 Running scraper: ${scraper.name}...`);
    
    // Import stats
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Run the scraper
    const events = await scraper.scrape();
    
    console.log(`✅ Scraped ${events.length} events from ${scraper.name}`);
    
    if (!skipDbConnection) {
      // Import each event to database
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
    }
    
    // Print summary
    console.log('\n📋 Import Summary:');
    console.log(`✅ Total events processed: ${events.length}`);
    
    if (!skipDbConnection) {
      console.log(`➕ New events imported: ${newCount}`);
      console.log(`🔄 Existing events updated: ${updatedCount}`);
      console.log(`⏭️ Events unchanged/skipped: ${skippedCount}`);
    } else {
      console.log(`💾 Events available for import: ${events.length}`);
    }
    
    // Return the events for potential further processing
    return events;
    
  } catch (error) {
    console.error(`❌ Error during import: ${error.message}`);
    return [];
  } finally {
    // Close the connection if it exists
    if (client && !skipDbConnection) {
      await client.close();
      console.log('✅ MongoDB connection closed');
    }
  }
}

// Export the function for use as a module
module.exports = {
  importCanadaPlaceEvents: importEvents
};

// Run the import function if this script is executed directly
if (require.main === module) {
  importEvents();
}
