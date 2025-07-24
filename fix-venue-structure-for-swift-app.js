/**
 * Script to fix Toronto events with incorrect venue structure
 * 
 * This script fixes events where venue is a string instead of an object,
 * which causes Swift app to fail with "Expected to decode Dictionary<String, Any> but found a string instead"
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const util = require('util');

// Get MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

async function fixVenueStructure() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    // Find events where venue is a string (not an object)
    const eventsToFix = await eventsCollection.find({
      venue: { $type: 'string' }
    }).toArray();
    
    console.log(`🔍 Found ${eventsToFix.length} events with venue as a string`);
    
    if (eventsToFix.length > 0) {
      console.log('\n📊 Sample events to fix:');
      eventsToFix.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`  - ID: ${event._id}`);
        console.log(`  - Name: ${event.name}`);
        console.log(`  - Venue: ${util.inspect(event.venue)}`);
      });
    }
    
    // Update events with incorrect venue structure
    let updateCount = 0;
    
    for (const event of eventsToFix) {
      const venueString = event.venue;
      
      // Create a proper venue object structure
      const venueObject = {
        name: venueString || 'Toronto Venue',
        address: event.location || 'Toronto, Ontario',
        city: event.city || 'Toronto',
        country: 'Canada',
        coordinates: {
          lat: 43.6532, // Toronto coordinates
          lng: -79.3832
        }
      };
      
      // Update the event in the database
      const result = await eventsCollection.updateOne(
        { _id: event._id },
        { $set: { venue: venueObject } }
      );
      
      if (result.modifiedCount > 0) {
        updateCount++;
      }
    }
    
    console.log(`\n✅ Successfully updated ${updateCount} events with proper venue structure`);
    
    if (updateCount > 0) {
      // Verify the fix by checking if any events still have venue as a string
      const remainingEvents = await eventsCollection.find({
        venue: { $type: 'string' }
      }).count();
      
      if (remainingEvents === 0) {
        console.log('🎉 SUCCESS! All events now have proper venue structure');
      } else {
        console.log(`⚠️ ${remainingEvents} events still have venue as a string`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing venue structure:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixVenueStructure().catch(console.error);
