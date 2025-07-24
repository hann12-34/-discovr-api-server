/**
 * Fix events with undefined venues
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixUndefinedVenues() {
  console.log('🔧 FIXING UNDEFINED VENUES');
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
    
    // Find events with undefined or null venues
    const eventsWithoutVenues = await collection.find({
      $or: [
        { venue: { $exists: false } },
        { venue: null },
        { venue: undefined }
      ]
    }).toArray();
    
    console.log(`📊 Found ${eventsWithoutVenues.length} events without venues`);
    
    if (eventsWithoutVenues.length > 0) {
      console.log('\n📋 Events without venues:');
      eventsWithoutVenues.slice(0, 5).forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.title || event.name}`);
        console.log(`      ID: ${event.id || event._id}`);
        console.log(`      Location: ${event.location}`);
        console.log(`      Venue: ${event.venue}`);
        console.log('');
      });
      
      console.log('\n🔧 Adding default venues...');
      
      for (const event of eventsWithoutVenues) {
        let city = 'Vancouver';
        let coordinates = { lat: 49.2827, lng: -123.1207 };
        
        // Try to determine city from location or title
        const text = (event.title || event.name || event.location || '').toLowerCase();
        
        if (text.includes('toronto')) {
          city = 'Toronto';
          coordinates = { lat: 43.6532, lng: -79.3832 };
        } else if (text.includes('vancouver')) {
          city = 'Vancouver';
          coordinates = { lat: 49.2827, lng: -123.1207 };
        }
        
        const defaultVenue = {
          name: 'Location TBD',
          id: 'location-tbd',
          city: city,
          coordinates: coordinates
        };
        
        await collection.updateOne(
          { _id: event._id },
          { $set: { venue: defaultVenue } }
        );
        
        console.log(`   ✅ Added venue to: ${event.title || event.name}`);
      }
      
      console.log(`\n✅ Added venues to ${eventsWithoutVenues.length} events`);
    }
    
    // Now check for events with venues but missing coordinates
    const eventsWithMissingCoordinates = await collection.find({
      venue: { $type: 'object' },
      'venue.coordinates': { $exists: false }
    }).toArray();
    
    console.log(`\n📊 Found ${eventsWithMissingCoordinates.length} events with venues missing coordinates`);
    
    if (eventsWithMissingCoordinates.length > 0) {
      console.log('\n🔧 Adding missing coordinates...');
      
      for (const event of eventsWithMissingCoordinates) {
        let coordinates = { lat: 49.2827, lng: -123.1207 }; // Default Vancouver
        
        // Try to determine coordinates from venue city or event context
        if (event.venue?.city) {
          const city = event.venue.city.toLowerCase();
          if (city.includes('toronto')) {
            coordinates = { lat: 43.6532, lng: -79.3832 };
          } else if (city.includes('vancouver')) {
            coordinates = { lat: 49.2827, lng: -123.1207 };
          }
        } else {
          // Check event text
          const text = (event.title || event.name || event.location || '').toLowerCase();
          if (text.includes('toronto')) {
            coordinates = { lat: 43.6532, lng: -79.3832 };
          }
        }
        
        await collection.updateOne(
          { _id: event._id },
          { $set: { 'venue.coordinates': coordinates } }
        );
        
        console.log(`   ✅ Added coordinates to: ${event.title || event.name}`);
      }
      
      console.log(`\n✅ Added coordinates to ${eventsWithMissingCoordinates.length} venues`);
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    
    const remainingVenueIssues = await collection.find({
      $or: [
        { venue: { $exists: false } },
        { venue: null },
        { venue: undefined }
      ]
    }).toArray();
    
    const remainingCoordinateIssues = await collection.find({
      venue: { $type: 'object' },
      'venue.coordinates': { $exists: false }
    }).toArray();
    
    console.log(`📊 Events without venues: ${remainingVenueIssues.length}`);
    console.log(`📊 Events without coordinates: ${remainingCoordinateIssues.length}`);
    
    if (remainingVenueIssues.length === 0 && remainingCoordinateIssues.length === 0) {
      console.log('🎉 100% COMPATIBILITY ACHIEVED!');
      console.log('📱 All events are now mobile app ready!');
    } else {
      console.log('⚠️ Some issues remain');
    }
    
  } catch (error) {
    console.error('❌ Error fixing undefined venues:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixUndefinedVenues().catch(console.error);
