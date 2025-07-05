/**
 * Cleanup script to remove bad Pearl Vancouver event entries from the database
 * This will remove any entries with "Untitled Event" titles or "TBD" dates
 */

// Import required modules
require('dotenv').config();
const { MongoClient } = require('mongodb');

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function cleanupEvents() {
  console.log('🧹 Starting Pearl Vancouver event cleanup...');
  
  // Create MongoDB client
  const client = new MongoClient(uri);
  
  try {
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB at ${uri.substring(0, 15)}...`);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Get database and events collection
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // First, list all collections in the database
    console.log('\n=== DATABASE COLLECTIONS ===');
    const collections = await database.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Check for ALL events to understand structure
    console.log('\n=== CHECKING ALL EVENTS ===');
    const allEvents = await eventsCollection.find({}).limit(3).toArray();
    if (allEvents.length > 0) {
      console.log(`Found ${allEvents.length} total events in the database`);
      console.log('Sample event structure:', JSON.stringify(allEvents[0], null, 2).substring(0, 500) + '...');
    } else {
      console.log('No events found in the database');
    }
    
    // Look for any Pearl Vancouver events with any structure
    console.log('\n=== CHECKING FOR PEARL VANCOUVER EVENTS WITH VENUE ARRAY ===');
    const pearlEvents1 = await eventsCollection.find({
      'venue.name': 'The Pearl Vancouver'
    }).toArray();
    console.log(`Found ${pearlEvents1.length} Pearl events with venue.name field`);
    
    console.log('\n=== CHECKING FOR PEARL VANCOUVER EVENTS WITH VENUE ELEMATCH ===');
    const pearlEvents2 = await eventsCollection.find({
      venue: { $elemMatch: { name: 'The Pearl Vancouver' } }
    }).toArray();
    console.log(`Found ${pearlEvents2.length} Pearl events with venue elemMatch`);
    
    console.log('\n=== CHECKING FOR ANY EVENTS WITH "UNTITLED EVENT" TITLE ===');
    const untitledEvents = await eventsCollection.find({
      title: 'Untitled Event'
    }).toArray();
    console.log(`Found ${untitledEvents.length} events with title "Untitled Event"`);
    
    if (untitledEvents.length > 0) {
      console.log('\n=== UNTITLED EVENTS DETAILS ===');
      untitledEvents.forEach((event, index) => {
        const venue = event.venue ? 
          (Array.isArray(event.venue) ? event.venue.map(v => v.name).join(', ') : 
           (typeof event.venue === 'object' ? event.venue.name : 'Unknown'))
          : 'Unknown';
        const date = event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : 'TBD';
        console.log(`${index + 1}. Title: "${event.title}", Venue: ${venue}, Date: ${date}, ID: ${event._id}`);
      });
      
      // Ask user for confirmation before deleting
      console.log('\n🔍 Found Untitled Events to clean up - executing delete operation');
      const result = await eventsCollection.deleteMany({ title: 'Untitled Event' });
      console.log(`🗑️ Removed ${result.deletedCount} Untitled Events`);
    } else {
      console.log('✅ No Untitled Events found');
    }
    
    // Check for null date events
    console.log('\n=== CHECKING FOR EVENTS WITH NULL DATES ===');
    const nullDateEvents = await eventsCollection.find({
      $or: [{ startDate: null }, { startDate: 'TBD' }]
    }).toArray();
    console.log(`Found ${nullDateEvents.length} events with null/TBD dates`);
    
    if (nullDateEvents.length > 0) {
      console.log('\n=== NULL DATE EVENTS DETAILS ===');
      nullDateEvents.forEach((event, index) => {
        const venue = event.venue ? 
          (Array.isArray(event.venue) ? event.venue.map(v => v.name).join(', ') : 
           (typeof event.venue === 'object' ? event.venue.name : 'Unknown'))
          : 'Unknown';
        console.log(`${index + 1}. Title: "${event.title}", Venue: ${venue}, ID: ${event._id}`);
      });
      
      // Delete null date events
      console.log('\n🔍 Found Events with null dates to clean up - executing delete operation');
      const result = await eventsCollection.deleteMany({ $or: [{ startDate: null }, { startDate: 'TBD' }] });
      console.log(`🗑️ Removed ${result.deletedCount} Events with null/TBD dates`);
    } else {
      console.log('✅ No Events with null dates found');
    }
    
  } catch (err) {
    console.error('❌ Error cleaning up events:', err);
  } finally {
    // Close the MongoDB connection
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the cleanup
cleanupEvents().catch(console.error);
