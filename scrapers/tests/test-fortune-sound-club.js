/**
 * Test Fortune Sound Club Scraper
 * 
 * This script tests the Fortune Sound Club scraper by running it and saving the results to MongoDB
 */

const mongoose = require('mongoose');
const fortuneScraper = require('../cities/vancouver/fortuneSoundClub');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.local' });

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

// Event schema for MongoDB
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  description: String,
  date: String,
  startDate: Date,
  endDate: Date,
  image: String,
  venue: Object,
  category: String,
  categories: [String],
  sourceURL: String,
  ticketURL: String,
  location: String,
  lastUpdated: Date
}, { strict: false });

// Run the scraper
async function runScraper() {
  console.log('🎵 Testing Fortune Sound Club scraper...\n');
  
  console.log('Running Fortune Sound Club scraper (using built-in fallback)...');
  const events = await fortuneScraper.scrape();
  console.log(`✅ Found ${events.length} events\n`);
  
  // Display sample events
  if (events.length > 0) {
    console.log('Sample events:\n');
    for (let i = 0; i < Math.min(3, events.length); i++) {
      const event = events[i];
      console.log(`--- Event ${i + 1} ---`);
      console.log(`Title: ${event.title}`);
      console.log(`Date: ${event.startDate.toLocaleString()}`);
      console.log(`Venue: ${event.venue.name}`);
      console.log(`URL: ${event.sourceURL}`);
      console.log('');
    }
  }
  
  // Save to MongoDB
  console.log('Saving to database...');
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get the Event model
    const Event = mongoose.model('Event', eventSchema);

    // Save events to the database one by one to handle duplicates properly
    if (events.length > 0) {
      let savedCount = 0;
      let skippedCount = 0;
      
      for (const event of events) {
        try {
          // First check if event already exists
          const existingEvent = await Event.findOne({ id: event.id });
          
          if (!existingEvent) {
            // Save new event
            await Event.create(event);
            savedCount++;
          } else {
            // Skip existing event
            skippedCount++;
          }
        } catch (err) {
          if (err.code === 11000) {
            // This is a duplicate, just skip it
            skippedCount++;
          } else {
            // This is some other error, log it
            console.error(`Error saving event ${event.title}:`, err.message);
          }
        }
      }
      
      console.log(`✅ Saved ${savedCount} new events to the database, skipped ${skippedCount} duplicates`);
    } else {
      console.log('❌ No new events to save');
    }
  } catch (error) {
    console.error(`❌ Error running Fortune Sound Club scraper: ${error.message}`);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the scraper
runScraper();
