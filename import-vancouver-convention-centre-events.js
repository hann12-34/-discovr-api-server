/**
 * Import Vancouver Convention Centre Events
 * This script imports events from the Vancouver Convention Centre website into MongoDB
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Import the scraper
const VancouverConventionCentreEvents = require('./scrapers/cities/vancouver/vancouverConventionCentreEvents');

/**
 * Imports Vancouver Convention Centre events into MongoDB
 * @param {boolean} skipDbConnection - Skip database connection (for testing)
 * @returns {Promise<Object>} - Summary of import results
 */
async function importVancouverConventionCentreEvents(skipDbConnection = false) {
  console.log('Starting Vancouver Convention Centre events import...');
  
  // Create a new scraper instance
  const scraper = new VancouverConventionCentreEvents();
  
  // Initialize counters for summary
  const summary = {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };
  
  try {
    // Scrape events
    console.log('Scraping Vancouver Convention Centre events...');
    const events = await scraper.scrape();
    summary.total = events.length;
    console.log(`Found ${events.length} events from Vancouver Convention Centre`);
    
    // If skipDbConnection is true, return the summary without connecting to the database
    if (skipDbConnection) {
      console.log('Skipping database connection (test mode)');
      return { summary, events };
    }
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(process.env.MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const eventsCollection = db.collection('events');
    
    // Process each event
    for (const event of events) {
      try {
        // Check if event already exists
        const existingEvent = await eventsCollection.findOne({ id: event.id });
        
        if (existingEvent) {
          // Check if the event has been updated
          if (new Date(event.lastUpdated) > new Date(existingEvent.lastUpdated)) {
            // Update the existing event
            await eventsCollection.updateOne(
              { id: event.id },
              { $set: event }
            );
            summary.updated++;
            console.log(`Updated event: ${event.title}`);
          } else {
            // Skip the event as it hasn't changed
            summary.skipped++;
            console.log(`Skipped event (no changes): ${event.title}`);
          }
        } else {
          // Insert new event
          await eventsCollection.insertOne(event);
          summary.inserted++;
          console.log(`Inserted new event: ${event.title}`);
        }
      } catch (error) {
        console.error(`Error processing event ${event.title}: ${error.message}`);
        summary.errors++;
      }
    }
    
    // Close the MongoDB connection
    await client.close();
    console.log('Closed MongoDB connection');
  } catch (error) {
    console.error(`Import failed: ${error.message}`);
    summary.errors++;
  }
  
  // Log import summary
  console.log('\n--- Import Summary ---');
  console.log(`Total events found: ${summary.total}`);
  console.log(`New events inserted: ${summary.inserted}`);
  console.log(`Existing events updated: ${summary.updated}`);
  console.log(`Events skipped (no changes): ${summary.skipped}`);
  console.log(`Errors: ${summary.errors}`);
  
  return { summary };
}

// Run the import function if this script is executed directly
if (require.main === module) {
  importVancouverConventionCentreEvents()
    .then(() => {
      console.log('Import completed');
      process.exit(0);
    })
    .catch(error => {
      console.error(`Import failed: ${error.message}`);
      process.exit(1);
    });
}

// Export the function for use in other scripts
module.exports = { importVancouverConventionCentreEvents };
