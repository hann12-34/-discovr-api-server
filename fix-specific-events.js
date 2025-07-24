/**
 * Fix the specific events by ID
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixSpecificEvents() {
  console.log('🔧 FIXING SPECIFIC EVENTS BY ID');
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
    
    // Find the specific events by ID
    const eventIds = [
      'vancouver-pride-pride-kick-off-party-2025-07-29',
      'vancouver-pride-pride-art-walk-2025-08-01'
    ];
    
    console.log('\n🔍 Finding specific events...');
    
    for (const eventId of eventIds) {
      const event = await collection.findOne({ id: eventId });
      
      if (event) {
        console.log(`\n   Found event: ${event.title || event.name}`);
        console.log(`   Current venue:`, JSON.stringify(event.venue, null, 2));
        
        // Check if it needs coordinates
        if (!event.venue.coordinates) {
          console.log('   ❌ Missing coordinates - fixing...');
          
          // Add coordinates for Vancouver
          const coordinates = { lat: 49.2827, lng: -123.1207 };
          
          await collection.updateOne(
            { _id: event._id },
            { $set: { 'venue.coordinates': coordinates } }
          );
          
          console.log(`   ✅ Added coordinates: ${coordinates.lat}, ${coordinates.lng}`);
        } else {
          console.log('   ✅ Already has coordinates');
        }
      } else {
        console.log(`   ❌ Event not found: ${eventId}`);
      }
    }
    
    // Final check for any remaining issues
    console.log('\n🔍 Final check for missing coordinates...');
    const remainingIssues = await collection.find({
      venue: { $type: 'object' },
      'venue.coordinates': { $exists: false }
    }).toArray();
    
    console.log(`📊 Events still missing coordinates: ${remainingIssues.length}`);
    
    if (remainingIssues.length > 0) {
      console.log('\n📋 Remaining problematic events:');
      remainingIssues.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.title || event.name}`);
        console.log(`      ID: ${event.id || event._id}`);
        console.log(`      Venue:`, JSON.stringify(event.venue, null, 2));
      });
    } else {
      console.log('🎉 100% COMPATIBILITY ACHIEVED!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing specific events:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixSpecificEvents().catch(console.error);
