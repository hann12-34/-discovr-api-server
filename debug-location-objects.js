/**
 * Debug script to find events with location objects instead of strings
 * This will help identify the exact records causing the API parsing error
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not defined!');
  process.exit(1);
}

// Create MongoDB Event model schema
const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema);

async function findLocationObjects() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Searching for events with location objects...');
    
    // Find events where location is an object (not a string)
    const eventsWithLocationObjects = await Event.find({
      location: { $type: "object" }
    }).limit(10);

    console.log(`📊 Found ${eventsWithLocationObjects.length} events with location objects:`);
    
    eventsWithLocationObjects.forEach((event, index) => {
      console.log(`\n${index + 1}. Event ID: ${event._id}`);
      console.log(`   Title: ${event.title || event.name}`);
      console.log(`   Source: ${event.source}`);
      console.log(`   Location (object):`, event.location);
      console.log(`   Scraped At: ${event.scrapedAt}`);
    });

    // Also get total count
    const totalCount = await Event.countDocuments({
      location: { $type: "object" }
    });
    
    console.log(`\n📊 Total events with location objects: ${totalCount}`);

    // Check if we can find the exact record at index 335
    console.log('\n🔍 Fetching events in order to find index 335...');
    const allEvents = await Event.find({}).limit(400);
    
    if (allEvents[335]) {
      console.log('\n🎯 Event at index 335:');
      console.log(`   ID: ${allEvents[335]._id}`);
      console.log(`   Title: ${allEvents[335].title || allEvents[335].name}`);
      console.log(`   Source: ${allEvents[335].source}`);
      console.log(`   Location type: ${typeof allEvents[335].location}`);
      console.log(`   Location value:`, allEvents[335].location);
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

findLocationObjects();
