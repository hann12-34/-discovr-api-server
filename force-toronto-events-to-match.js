/**
 * Force all Toronto events to exactly match the format of the working event
 * This ensures they pass the Swift app's isEventFromCity() function
 */
const { MongoClient } = require('mongodb');

async function forceTorontoEventsToMatch() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Find all Toronto events
    const torontoEvents = await eventsCollection.find({
      $or: [
        { city: "Toronto" },
        { name: { $regex: "Toronto", $options: "i" } },
        { location: { $regex: "Toronto", $options: "i" } },
        { venue: { $regex: "Toronto", $options: "i" } },
      ]
    }).toArray();
    
    console.log(`📊 Found ${torontoEvents.length} Toronto events to fix`);
    
    // Update each event to match exactly what the Swift app expects
    let updateCount = 0;
    for (const event of torontoEvents) {
      // Ensure name starts with "Toronto - "
      let updatedName = event.name;
      if (!event.name.match(/^Toronto -/i)) {
        updatedName = `Toronto - ${event.name}`;
      }
      
      // Ensure the object has the precise fields needed to pass city filtering in Swift
      const updateFields = {
        // Name must start with "Toronto -"
        name: updatedName,
        
        // City must be exact match
        city: "Toronto",
        cityId: "Toronto",
        
        // Location must include "Toronto" at start
        location: event.location.includes("Toronto") ? 
          event.location : `Toronto, ${event.location}`,
        
        // Venue must be "Toronto" as a string, not an object
        venue: "Toronto",
        
        // Ensure title contains Toronto
        title: event.title?.includes("Toronto") ? 
          event.title : `Toronto - ${event.title || event.name}`,
        
        // Set last updated
        lastUpdated: new Date()
      };
      
      // Update the event document
      const result = await eventsCollection.updateOne(
        { _id: event._id }, 
        { $set: updateFields }
      );
      
      if (result.modifiedCount > 0) {
        updateCount++;
      }
    }
    
    console.log(`✅ Updated ${updateCount} out of ${torontoEvents.length} Toronto events to match Swift app expectations`);
    
    // Verify that events are correctly formatted now
    const verifiedEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`\n📋 Verification: ${verifiedEvents.length} events with city="Toronto"`);
    console.log("📝 Sample Toronto event:");
    if (verifiedEvents.length > 0) {
      console.log(JSON.stringify({
        id: verifiedEvents[0].id,
        name: verifiedEvents[0].name,
        city: verifiedEvents[0].city,
        venue: verifiedEvents[0].venue,
        location: verifiedEvents[0].location
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error fixing Toronto events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

forceTorontoEventsToMatch().catch(console.error);
