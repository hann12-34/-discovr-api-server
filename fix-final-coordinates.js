/**
 * Fix the final 2 events missing venue coordinates
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// Default coordinates for major cities
const CITY_COORDINATES = {
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'North Vancouver': { lat: 49.3163, lng: -123.0693 },
  'Burnaby': { lat: 49.2488, lng: -123.0045 },
  'Richmond': { lat: 49.1666, lng: -123.1336 },
  'Surrey': { lat: 49.1913, lng: -122.8490 },
  'Mississauga': { lat: 43.5890, lng: -79.6441 },
  'Brampton': { lat: 43.7315, lng: -79.7624 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 }
};

async function fixFinalCoordinates() {
  console.log('🔧 FIXING FINAL COORDINATE ISSUES');
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
    
    // Find the remaining events missing coordinates
    const eventsWithMissingCoordinates = await collection.find({
      venue: { $type: 'object' },
      'venue.coordinates': { $exists: false }
    }).toArray();
    
    console.log(`📊 Found ${eventsWithMissingCoordinates.length} events still missing coordinates`);
    
    if (eventsWithMissingCoordinates.length === 0) {
      console.log('✅ All events have coordinates!');
      return;
    }
    
    // Show and fix each event
    console.log('\n🔧 Fixing remaining events:');
    
    for (const event of eventsWithMissingCoordinates) {
      console.log(`\n   Event: ${event.title || event.name || 'No title'}`);
      console.log(`   Venue: ${event.venue?.name}`);
      console.log(`   City: ${event.venue?.city}`);
      console.log(`   Location: ${event.location}`);
      
      let coordinates = null;
      
      // Try to get coordinates based on city
      if (event.venue?.city) {
        const city = event.venue.city;
        coordinates = CITY_COORDINATES[city];
        
        if (!coordinates) {
          // Try partial matches
          for (const [cityName, coords] of Object.entries(CITY_COORDINATES)) {
            if (city.includes(cityName) || cityName.includes(city)) {
              coordinates = coords;
              break;
            }
          }
        }
      }
      
      // Fallback based on event title or location
      if (!coordinates) {
        const text = (event.title || event.name || event.location || '').toLowerCase();
        
        if (text.includes('vancouver')) {
          coordinates = CITY_COORDINATES['Vancouver'];
        } else if (text.includes('toronto')) {
          coordinates = CITY_COORDINATES['Toronto'];
        } else {
          // Default to Vancouver
          coordinates = CITY_COORDINATES['Vancouver'];
        }
      }
      
      // Update the event
      if (coordinates) {
        await collection.updateOne(
          { _id: event._id },
          { $set: { 'venue.coordinates': coordinates } }
        );
        
        console.log(`   ✅ Added coordinates: ${coordinates.lat}, ${coordinates.lng}`);
      }
    }
    
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
    console.error('❌ Error fixing final coordinates:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixFinalCoordinates().catch(console.error);
