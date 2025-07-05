/**
 * Import Script for Additional Vancouver Venue Events
 * 
 * This script imports events from Coastal Jazz Festival, Carnaval Del Sol, and Theatre Under the Stars
 * into the cloud MongoDB database
 */

const { MongoClient } = require('mongodb');

// Import scrapers
const coastalJazzFestival = require('./scrapers/cities/vancouver/coastalJazzFestival');
const carnavalDelSol = require('./scrapers/cities/vancouver/carnavalDelSol');
const theatreUnderTheStars = require('./scrapers/cities/vancouver/theatreUnderTheStars');

// Cloud MongoDB URI from README
const uri = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr';

// Database and collection names
const dbName = 'discovr';
const collectionName = 'events';

/**
 * Connect to MongoDB and import events
 */
async function importEvents() {
  console.log('🔄 Starting import process for additional Vancouver venues...');
  
  // Connect to MongoDB
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to Cloud MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Get all scrapers
    const scrapers = [
      coastalJazzFestival,
      carnavalDelSol,
      theatreUnderTheStars
    ];
    
    // Import stats
    let totalEvents = 0;
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each scraper
    for (const scraper of scrapers) {
      try {
        console.log(`\n🔍 Running scraper: ${scraper.name}...`);
        
        // Run the scraper
        const events = await scraper.scrape();
        totalEvents += events.length;
        
        console.log(`✅ Scraped ${events.length} events from ${scraper.name}`);
        
        // Import each event
        for (const event of events) {
          // Make sure event has sourceIdentifier
          if (!event.sourceIdentifier && scraper.sourceIdentifier) {
            event.sourceIdentifier = scraper.sourceIdentifier;
          }
          
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
      } catch (error) {
        console.error(`❌ Error with ${scraper.name} scraper: ${error.message}`);
      }
    }
    
    // Print summary
    console.log('\n📊 Import Summary:');
    console.log(`✅ Total scrapers processed: ${scrapers.length}`);
    console.log(`✅ Total events processed: ${totalEvents}`);
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
importEvents();
