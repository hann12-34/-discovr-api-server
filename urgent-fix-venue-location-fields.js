/**
 * URGENT: Fix venue.location field type mismatch causing mobile app decoding failure
 * 
 * Error: Expected Dictionary<String, Any> but found string at Index 2026 venue.location field
 * Result: Mobile app shows 0 events instead of 2852 events
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

async function urgentFixVenueLocationFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🚨 URGENT: Connecting to MongoDB to fix venue.location field type mismatch...');
    await client.connect();
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    console.log('📊 Analyzing all events for venue.location field types...');
    
    // Get all events to analyze venue.location field types
    const allEvents = await eventsCollection.find({}).toArray();
    console.log(`📊 Total events: ${allEvents.length}`);
    
    let stringLocations = 0;
    let objectLocations = 0;
    let undefinedLocations = 0;
    let nullLocations = 0;
    let otherTypes = 0;
    
    const problematicEvents = [];
    
    // Analyze each event
    allEvents.forEach((event, index) => {
      if (event.venue && event.venue.location !== undefined) {
        const locationType = typeof event.venue.location;
        
        if (locationType === 'string') {
          stringLocations++;
          problematicEvents.push({
            index,
            id: event._id,
            title: event.title || event.name || 'Untitled',
            location: event.venue.location,
            locationType: locationType
          });
          
          // Check if this is the problematic Index 2026
          if (index === 2026) {
            console.log(`🎯 FOUND PROBLEMATIC EVENT AT INDEX 2026:`);
            console.log(`   ID: ${event._id}`);
            console.log(`   Title: ${event.title || event.name || 'Untitled'}`);
            console.log(`   venue.location: "${event.venue.location}" (${locationType})`);
          }
        } else if (locationType === 'object') {
          objectLocations++;
        } else if (event.venue.location === null) {
          nullLocations++;
        } else {
          otherTypes++;
        }
      } else {
        undefinedLocations++;
      }
    });
    
    console.log('\n📊 VENUE.LOCATION FIELD TYPE ANALYSIS:');
    console.log(`   ❌ String locations: ${stringLocations}`);
    console.log(`   ✅ Object locations: ${objectLocations}`);
    console.log(`   ⚪ Undefined locations: ${undefinedLocations}`);
    console.log(`   ⚪ Null locations: ${nullLocations}`);
    console.log(`   ❓ Other types: ${otherTypes}`);
    
    if (stringLocations > 0) {
      console.log('\n🚨 PROBLEMATIC EVENTS WITH STRING venue.location:');
      problematicEvents.slice(0, 10).forEach((event, i) => {
        console.log(`   ${i + 1}. [Index ${event.index}] ${event.title} - Location: "${event.location}" (${event.locationType})`);
      });
      
      if (problematicEvents.length > 10) {
        console.log(`   ... and ${problematicEvents.length - 10} more`);
      }
      
      console.log('\n🔧 FIXING ALL STRING venue.location FIELDS...');
      
      // Fix all events with string venue.location
      let fixedCount = 0;
      
      for (const event of problematicEvents) {
        try {
          // Convert string location to proper object format
          const locationObject = {
            address: event.location,
            coordinates: {
              lat: 0,
              lng: 0
            }
          };
          
          const result = await eventsCollection.updateOne(
            { _id: event.id },
            { 
              $set: { 
                'venue.location': locationObject,
                updatedAt: new Date()
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            fixedCount++;
            console.log(`   ✅ Fixed: ${event.title} - Location: "${event.location}" → {address: "${event.location}", coordinates: {lat: 0, lng: 0}}`);
          }
        } catch (error) {
          console.error(`   ❌ Error fixing ${event.title}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 FIXED ${fixedCount} EVENTS WITH STRING venue.location!`);
      
      // Verify the fix
      console.log('\n🔍 VERIFYING FIX...');
      const remainingStringLocations = await eventsCollection.countDocuments({ 
        'venue.location': { $type: "string" } 
      });
      
      console.log(`📊 Remaining string venue.location fields: ${remainingStringLocations}`);
      
      if (remainingStringLocations === 0) {
        console.log('✅ SUCCESS: All venue.location fields are now objects or undefined/null!');
        console.log('✅ Mobile app decoding should now work correctly!');
      } else {
        console.log(`⚠️  WARNING: ${remainingStringLocations} string venue.location fields still remain!`);
      }
      
    } else {
      console.log('✅ No string venue.location fields found - all are properly formatted!');
    }
    
    console.log('\n📊 FINAL DATABASE STATE:');
    const finalObjectLocations = await eventsCollection.countDocuments({ 
      'venue.location': { $type: "object" } 
    });
    const finalStringLocations = await eventsCollection.countDocuments({ 
      'venue.location': { $type: "string" } 
    });
    const finalUndefinedLocations = await eventsCollection.countDocuments({ 
      'venue.location': { $exists: false } 
    });
    const finalNullLocations = await eventsCollection.countDocuments({ 
      'venue.location': null 
    });
    
    console.log(`   ✅ Object locations: ${finalObjectLocations}`);
    console.log(`   ❌ String locations: ${finalStringLocations}`);
    console.log(`   ⚪ Undefined locations: ${finalUndefinedLocations}`);
    console.log(`   ⚪ Null locations: ${finalNullLocations}`);
    
  } catch (error) {
    console.error('❌ Error in urgent venue.location field fix:', error.message);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed.');
  }
}

// Run the urgent fix
urgentFixVenueLocationFields().catch(console.error);
