/**
 * Fix TBD venues with proper coordinates
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixTBDVenues() {
  console.log('🔧 FIXING TBD VENUES');
  console.log('=' .repeat(50));
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('events');
    
    // Find the specific TBD events
    const tbdEvents = await collection.find({
      'venue.name': 'Location TBD'
    }).toArray();
    
    console.log(`📊 Found ${tbdEvents.length} TBD venue events`);
    
    if (tbdEvents.length === 0) {
      console.log('✅ No TBD venues found!');
      return;
    }
    
    // Fix each TBD event
    console.log('\n🔧 Fixing TBD venues:');
    
    for (const event of tbdEvents) {
      console.log(`\n   Event: ${event.title || event.name}`);
      console.log(`   Current venue:`, JSON.stringify(event.venue, null, 2));
      
      // Determine coordinates based on event context
      let coordinates = { lat: 49.2827, lng: -123.1207 }; // Default Vancouver
      let city = 'Vancouver';
      
      // Check if it's a Vancouver Pride event
      const eventText = (event.title || event.name || event.location || '').toLowerCase();
      if (eventText.includes('pride') && eventText.includes('vancouver')) {
        coordinates = { lat: 49.2827, lng: -123.1207 };
        city = 'Vancouver';
      }
      
      // Update the venue structure
      const updatedVenue = {
        name: 'Location TBD',
        id: 'location-tbd',
        city: city,
        coordinates: coordinates
      };
      
      await collection.updateOne(
        { _id: event._id },
        { $set: { venue: updatedVenue } }
      );
      
      console.log(`   ✅ Updated venue with coordinates: ${coordinates.lat}, ${coordinates.lng}`);
    }
    
    console.log(`\n✅ Fixed ${tbdEvents.length} TBD venues`);
    
    // Final verification
    console.log('\n🔍 Final verification...');
    const remainingIssues = await collection.find({
      venue: { $type: 'object' },
      'venue.coordinates': { $exists: false }
    }).toArray();
    
    console.log(`📊 Events still missing coordinates: ${remainingIssues.length}`);
    
    if (remainingIssues.length === 0) {
      console.log('🎉 100% COMPATIBILITY ACHIEVED!');
      console.log('📱 All events are now mobile app ready!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing TBD venues:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixTBDVenues().catch(console.error);
