// Test script for Fox Cabaret scraper
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const foxScraper = require('./foxCabaret');

// Add debug logging
console.log(`Testing test-fox-cabaret.js...`);


console.log('🦊 Testing Fox Cabaret scraper...');

async function testFoxCabaretScraper() {
  try {
    // Use the exported instance directly
    
    console.log('\nRunning Fox Cabaret scraper (using built-in fallback)...');
    const events = await foxScraper.scrape();
    console.log(`✅ Found ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nSample events:');
      events.slice(0, 3).forEach((event, i) => {
        console.log(`\n--- Event ${i + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.startDate).toLocaleString()}`);
        console.log(`Venue: ${event.venue ? event.venue.name : 'N/A'}`);
        console.log(`URL: ${event.sourceURL || event.officialWebsite || 'N/A'}`);
      });
    }
    
    // Save to database if MONGODB_URI is set
    if (process.env.MONGODB_URI) {
      console.log('\nSaving to database...');
      
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('✅ Connected to MongoDB');
      
      // Import Event model from main project
      const Event = require('../../models/Event');
      
      // Skip existing events (based on URL) to avoid duplicates
      const newEvents = [];
      const skippedEvents = [];
      
      for (const event of events) {
        const sourceURL = event.sourceURL || event.officialWebsite;
        
        // Skip if we have no URL to check duplicates against
        if (!sourceURL) continue;
        
        const existingEvent = await Event.findOne({ sourceURL });
        
        if (!existingEvent) {
          newEvents.push(event);
        } else {
          skippedEvents.push({
            title: event.title,
            id: existingEvent.id
          });
        }
      }
      
      if (newEvents.length > 0) {
        await Event.insertMany(newEvents);
        console.log(`✅ Saved ${newEvents.length} new events to database`);
      } else {
        console.log('❌ No new events to save');
      }
      
      if (skippedEvents.length > 0) {
        console.log(`ℹ️ Skipped ${skippedEvents.length} existing events`);
      }
      
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    }
    
  } catch (error) {
    console.error('❌ Error running Fox Cabaret scraper:', error);
    process.exit(1);
  }
}

try {
  testFoxCabaretScraper().catch(console.error);
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
