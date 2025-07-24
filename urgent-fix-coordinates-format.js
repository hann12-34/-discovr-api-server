/**
 * URGENT: Fix venue.location.coordinates format from object to array
 * 
 * Error: Expected Array<Any> but found dictionary at venue.location.coordinates
 * Mobile app expects coordinates as [longitude, latitude] array, not {lat, lng} object
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

async function urgentFixCoordinatesFormat() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🚨 URGENT: Connecting to MongoDB to fix coordinates format...');
    await client.connect();
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    console.log('📊 Finding all events with object coordinates...');
    
    // Find all events where venue.location.coordinates is an object (not array)
    const eventsWithObjectCoordinates = await eventsCollection.find({
      'venue.location.coordinates.lat': { $exists: true }
    }).toArray();
    
    console.log(`📊 Found ${eventsWithObjectCoordinates.length} events with object coordinates`);
    
    if (eventsWithObjectCoordinates.length > 0) {
      console.log('\n🚨 SAMPLE PROBLEMATIC COORDINATES:');
      eventsWithObjectCoordinates.slice(0, 5).forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.title || event.name || 'Untitled'}`);
        console.log(`      Current: ${JSON.stringify(event.venue.location.coordinates)}`);
        
        const lat = event.venue.location.coordinates.lat || 0;
        const lng = event.venue.location.coordinates.lng || 0;
        console.log(`      Should be: [${lng}, ${lat}]  // [longitude, latitude]`);
      });
      
      console.log('\n🔧 FIXING ALL OBJECT COORDINATES TO ARRAY FORMAT...');
      
      let fixedCount = 0;
      
      for (const event of eventsWithObjectCoordinates) {
        try {
          const currentCoords = event.venue.location.coordinates;
          const lat = currentCoords.lat || 0;
          const lng = currentCoords.lng || 0;
          
          // MongoDB expects [longitude, latitude] format
          const arrayCoordinates = [lng, lat];
          
          const result = await eventsCollection.updateOne(
            { _id: event._id },
            { 
              $set: { 
                'venue.location.coordinates': arrayCoordinates,
                updatedAt: new Date()
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            fixedCount++;
            console.log(`   ✅ Fixed: ${event.title || event.name || 'Untitled'} - Coordinates: {lat: ${lat}, lng: ${lng}} → [${lng}, ${lat}]`);
          }
        } catch (error) {
          console.error(`   ❌ Error fixing ${event.title || event.name || 'Untitled'}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 FIXED ${fixedCount} EVENTS WITH OBJECT COORDINATES!`);
      
      // Verify the fix
      console.log('\n🔍 VERIFYING FIX...');
      const remainingObjectCoordinates = await eventsCollection.countDocuments({
        'venue.location.coordinates.lat': { $exists: true }
      });
      
      console.log(`📊 Remaining object coordinates: ${remainingObjectCoordinates}`);
      
      if (remainingObjectCoordinates === 0) {
        console.log('✅ SUCCESS: All coordinates are now in array format!');
        console.log('✅ Mobile app decoding should now work correctly!');
      } else {
        console.log(`⚠️  WARNING: ${remainingObjectCoordinates} object coordinates still remain!`);
      }
      
    } else {
      console.log('✅ No object coordinates found - all are already in correct array format!');
    }
    
    console.log('\n📊 FINAL COORDINATE FORMAT ANALYSIS:');
    const arrayCoordinates = await eventsCollection.countDocuments({
      'venue.location.coordinates': { $type: "array" }
    });
    const noCoordinates = await eventsCollection.countDocuments({
      'venue.location.coordinates': { $exists: false }
    });
    const nullCoordinates = await eventsCollection.countDocuments({
      'venue.location.coordinates': null
    });
    
    console.log(`   ✅ Array coordinates: ${arrayCoordinates}`);
    console.log(`   ⚪ No coordinates: ${noCoordinates}`);
    console.log(`   ⚪ Null coordinates: ${nullCoordinates}`);
    
  } catch (error) {
    console.error('❌ Error in urgent coordinates format fix:', error.message);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed.');
  }
}

// Run the urgent fix
urgentFixCoordinatesFormat().catch(console.error);
