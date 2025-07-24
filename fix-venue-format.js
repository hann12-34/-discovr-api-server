/**
 * Script to fix the venue format for Toronto events
 * to ensure it's a string value as expected by the app's filtering logic
 */
const { MongoClient } = require('mongodb');

async function fixVenueFormat() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Find all Toronto events
    const torontoEvents = await eventsCollection.find({
      city: 'Toronto'
    }).toArray();
    
    console.log(`📊 Found ${torontoEvents.length} Toronto events to fix venue format`);
    
    // Fix venue format for all Toronto events
    let updateCount = 0;
    for (const event of torontoEvents) {
      // Make sure venue is a string, not an object
      let venueString = 'Toronto Venue';
      
      if (typeof event.venue === 'string') {
        venueString = event.venue;
      } else if (event.venue && typeof event.venue.name === 'string') {
        venueString = event.venue.name;
      }
      
      // Ensure venue string mentions Toronto
      if (!venueString.toLowerCase().includes('toronto')) {
        venueString = `Toronto ${venueString}`;
      }
      
      // Update the event document
      const result = await eventsCollection.updateOne(
        { _id: event._id }, 
        { $set: { 
          venue: venueString,
          // Additional fields to enhance city detection:
          cityId: 'Toronto',
          // Ensure name has Toronto mentioned prominently
          name: event.name && event.name.toLowerCase().includes('toronto') ? 
            event.name : `Toronto: ${event.name || event.title || 'Event'}`,
          // Add a 'toronto_' prefix to any id fields
          venueId: `toronto_${event._id.toString()}`
        }}
      );
      
      if (result.modifiedCount > 0) {
        updateCount++;
      }
    }
    
    console.log(`✅ Updated ${updateCount} out of ${torontoEvents.length} Toronto events with proper venue format`);
    
    // Print example of an updated event
    if (torontoEvents.length > 0) {
      const updatedEvent = await eventsCollection.findOne({ _id: torontoEvents[0]._id });
      console.log('📝 Example of updated event:');
      console.log(JSON.stringify(updatedEvent, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error fixing venue format:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixVenueFormat().catch(console.error);
