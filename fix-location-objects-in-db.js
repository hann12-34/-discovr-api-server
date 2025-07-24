/**
 * Fix script to convert location objects to strings in the database
 * This will resolve the API parsing error at index 335
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

async function fixLocationObjects() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Finding events with location objects...');
    
    // Find events where location is an object (not a string)
    const eventsWithLocationObjects = await Event.find({
      location: { $type: "object" }
    });

    console.log(`📊 Found ${eventsWithLocationObjects.length} events with location objects`);
    
    let fixedCount = 0;
    
    for (const event of eventsWithLocationObjects) {
      try {
        // Convert location object to string
        let locationString = 'Toronto, Ontario'; // Default fallback
        
        if (event.location) {
          if (event.location.name && event.location.city) {
            locationString = `${event.location.city}, Ontario`;
          } else if (event.location.city) {
            locationString = `${event.location.city}, Ontario`;
          } else if (event.location.name) {
            locationString = event.location.name;
          }
        }
        
        // Update the event with string location
        await Event.updateOne(
          { _id: event._id },
          { $set: { location: locationString } }
        );
        
        console.log(`✅ Fixed event: ${event.title || event.name} - Location: "${locationString}"`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Error fixing event ${event._id}: ${error.message}`);
      }
    }

    console.log(`\n🎉 Successfully fixed ${fixedCount} events!`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const remainingObjectLocations = await Event.countDocuments({
      location: { $type: "object" }
    });
    
    console.log(`📊 Remaining events with location objects: ${remainingObjectLocations}`);
    
    if (remainingObjectLocations === 0) {
      console.log('✅ All location objects have been converted to strings!');
      console.log('🎉 API parsing error should now be resolved!');
    } else {
      console.log('⚠️ Some location objects still remain - may need manual review');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixLocationObjects();
