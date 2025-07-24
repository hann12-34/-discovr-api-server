/**
 * Script to check Toronto events in the database
 * Verifies that events are properly formatted and visible
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// Get MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

async function checkTorontoEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('\n🔍 Checking Toronto events in database...');
    
    // Method 1: Check events with city = "Toronto"
    const cityTorontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`\n📊 Events with city="Toronto": ${cityTorontoEvents.length}`);
    
    // Method 2: Check events with Toronto in the name
    const nameTorontoEvents = await eventsCollection.find({
      name: { $regex: /Toronto/i }
    }).toArray();
    
    console.log(`📊 Events with "Toronto" in name: ${nameTorontoEvents.length}`);
    
    // Method 3: Check events with Toronto in venue
    const venueTorontoEvents = await eventsCollection.find({
      "venue.name": { $regex: /Toronto/i }
    }).toArray();
    
    console.log(`📊 Events with "Toronto" in venue.name: ${venueTorontoEvents.length}`);
    
    // Method 4: Check events with Toronto in location
    const locationTorontoEvents = await eventsCollection.find({
      location: { $regex: /Toronto/i }
    }).toArray();
    
    console.log(`📊 Events with "Toronto" in location: ${locationTorontoEvents.length}`);
    
    // Display sample Toronto events
    if (cityTorontoEvents.length > 0) {
      console.log('\n📋 Sample Toronto events from database:');
      cityTorontoEvents.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}: ${event.name || 'Unnamed event'}`);
        console.log(`  - ID: ${event._id}`);
        console.log(`  - City: ${event.city}`);
        console.log(`  - Location: ${event.location}`);
        console.log(`  - Venue: ${JSON.stringify(event.venue)}`);
        console.log(`  - Start Date: ${new Date(event.startDate).toLocaleDateString()}`);
      });
    }
    
    console.log('\n✅ Database check complete');
    
  } catch (error) {
    console.error('❌ Error checking Toronto events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkTorontoEvents().catch(console.error);
