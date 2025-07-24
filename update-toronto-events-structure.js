/**
 * Script to update Toronto events to ensure they have the proper structure
 * for the Discovr app to recognize them.
 */
const { MongoClient } = require('mongodb');

async function updateTorontoEventsStructure() {
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
        { 'venue.city': { $regex: 'Toronto', $options: 'i' } },
        { city: { $regex: 'Toronto', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${torontoEvents.length} Toronto events to update`);
    
    // Update each Toronto event to add required fields for app compatibility
    let updateCount = 0;
    for (const event of torontoEvents) {
      // Prepare fields to match SeasonalActivity structure
      const updateFields = {
        // Essential fields for Toronto city detection
        cityId: 'Toronto',
        city: 'Toronto',
        
        // Ensure location field contains Toronto
        location: event.location || (event.venue?.name ? `${event.venue.name}, Toronto, ON` : 'Toronto, ON'),
        
        // Add or ensure venue field contains Toronto
        venue: event.venue?.name || 'Toronto Venue',
        
        // Add coordinate information if missing
        latitude: event.latitude || event.venue?.latitude || 43.6532,
        longitude: event.longitude || event.venue?.longitude || -79.3832,
        
        // Ensure venueId includes Toronto for additional detection
        venueId: event._id ? `toronto_venue_${event._id}` : `toronto_venue_${new Date().getTime()}`,
        
        // Additional fields from SeasonalActivity model
        dateRange: {
          startDate: event.startDate || new Date(),
          endDate: event.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default to 1 week if missing
        },
        
        // If any essential fields are missing, add defaults
        name: event.title || event.name || 'Toronto Event',
        description: event.description || 'Event in Toronto',
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
    
    console.log(`✅ Updated ${updateCount} out of ${torontoEvents.length} Toronto events with proper structure`);
    
    // Print example of an updated event
    if (torontoEvents.length > 0) {
      const updatedEvent = await eventsCollection.findOne({ _id: torontoEvents[0]._id });
      console.log('📝 Example of updated event:');
      console.log(JSON.stringify(updatedEvent, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error updating Toronto events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updateTorontoEventsStructure().catch(console.error);
