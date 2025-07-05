/**
 * Import Squamish Beer Festival Events
 * 
 * This script scrapes events from Squamish Beer Festival and imports them into MongoDB
 */

require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const squamishBeerFestival = require('./scrapers/cities/vancouver/squamishBeerFestival');

// MongoDB connection URI - directly using localhost
const uri = 'mongodb://localhost:27017';
// Removed the check for MONGODB_URI environment variable as it's no longer used

// Create MongoDB client
const client = new MongoClient(uri, {
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function importSquamishBeerFestivalEvents() {
  console.log('🔄 Starting Squamish Beer Festival import process...');
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Use the discovr database explicitly
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Scrape events
    console.log('🔍 Scraping events from Squamish Beer Festival...');
    const events = await squamishBeerFestival.scrape();
    console.log(`✅ Scraped ${events.length} events`);
    
    if (events.length === 0) {
      console.log('⚠️ No events found, nothing to import');
      return;
    }
    
    // Process each event
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const event of events) {
      // Check if event already exists (by ID)
      const existingEvent = await eventsCollection.findOne({ id: event.id });
      
      if (existingEvent) {
        // Update existing event
        const result = await eventsCollection.updateOne(
          { id: event.id },
          { $set: { 
              ...event,
              lastUpdated: new Date() 
            } 
          }
        );
        
        if (result.modifiedCount > 0) {
          updated++;
          console.log(`🔄 Updated event: ${event.title}`);
        } else {
          skipped++;
          console.log(`⏭️ No changes for event: ${event.title}`);
        }
      } else {
        // Insert new event
        await eventsCollection.insertOne({
          ...event,
          lastUpdated: new Date()
        });
        imported++;
        console.log(`➕ Imported new event: ${event.title}`);
      }
    }
    
    // Summary
    console.log('\n📊 Import Summary:');
    console.log(`✅ Total events processed: ${events.length}`);
    console.log(`➕ New events imported: ${imported}`);
    console.log(`🔄 Existing events updated: ${updated}`);
    console.log(`⏭️ Events unchanged/skipped: ${skipped}`);
    
  } catch (error) {
    console.error(`❌ Error during import: ${error.message}`);
    console.error(error);
  } finally {
    // Close the connection
    await client.close();
    console.log('🔒 MongoDB connection closed');
  }
}

// Run the import process
importSquamishBeerFestivalEvents()
  .then(() => console.log('✅ Import process completed'))
  .catch(err => console.error(`❌ Import process failed: ${err.message}`));
