/**
 * Import Gastown Sunday Set Events
 * 
 * This script scrapes events from Gastown Sunday Set and imports them into MongoDB
 */

require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const gastownScraper = require('./scrapers/gastown-sunday-set-scraper');

// MongoDB connection URI (from environment variable)
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Create MongoDB client
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function importGastownEvents() {
  console.log('🔄 Starting Gastown Sunday Set events import process...');
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Use the discovr database explicitly
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Scrape events
    console.log('🔍 Scraping events from Gastown Sunday Set...');
    const events = await gastownScraper.scrape();
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
importGastownEvents()
  .then(() => console.log('✅ Import process completed'))
  .catch(err => console.error(`❌ Import process failed: ${err.message}`));
