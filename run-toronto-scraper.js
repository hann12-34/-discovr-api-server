/**
 * Script to run the Toronto scraper and add events to the database
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const TorontoEventsOfficial = require('./scrapers/cities/Toronto/toronto-events');

// Get MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

async function runTorontoScraper() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    // Initialize and run the Toronto scraper
    console.log('\n🔍 Running Toronto scraper...');
    const torontoScraper = new TorontoEventsOfficial();
    const events = await torontoScraper.fetchEvents();
    
    console.log(`\n✅ Fetched ${events.length} Toronto events from scraper`);
    
    // Insert events into the database
    console.log('\n📝 Adding events to database...');
    let newEvents = 0;
    let updatedEvents = 0;
    
    for (const event of events) {
      // Check if event already exists (by name and venue)
      const existingEvent = await eventsCollection.findOne({
        name: event.name,
        "venue.name": event.venue.name
      });
      
      if (existingEvent) {
        // Update existing event
        await eventsCollection.updateOne(
          { _id: existingEvent._id },
          { $set: event }
        );
        updatedEvents++;
      } else {
        // Insert new event
        await eventsCollection.insertOne(event);
        newEvents++;
      }
    }
    
    console.log(`\n✅ Added ${newEvents} new events and updated ${updatedEvents} existing events`);
    
    // Check Toronto events after scraping
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`\n📊 Total events with city="Toronto" after scraping: ${torontoEvents.length}`);
    
    console.log('\n🎉 Toronto scraper completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running Toronto scraper:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
runTorontoScraper().catch(console.error);
