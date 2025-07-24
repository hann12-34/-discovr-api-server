/**
 * Script to update Toronto events to match the exact SeasonalActivity structure
 * required by the Discovr app.
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
    
    // Update each Toronto event to match SeasonalActivity structure
    let updateCount = 0;
    for (const event of torontoEvents) {
      // Create a properly structured event object matching SeasonalActivity fields
      const updateFields = {
        // Set cityId to 'Toronto' (critical field used by app)
        cityId: 'Toronto',
        
        // Keep name and add title if not present (used for display)
        name: event.title || event.name || 'Toronto Event',
        
        // Ensure location field mentions Toronto
        location: event.location || `${event.venue?.name || 'Toronto venue'}, Toronto, ON`,
        
        // Fix venue field format
        venue: event.venue?.name || 'Toronto Venue',
        
        // Coordinates for Toronto
        latitude: event.latitude || 43.6532,
        longitude: event.longitude || -79.3832,
        
        // Season field is required
        season: event.season || 'Summer',
        
        // Ensure description exists and mentions Toronto
        description: event.description || `Event located in Toronto, Ontario`,
        
        // Date range structure matching SeasonalActivity
        dateRange: {
          startDate: event.startDate || new Date(),
          endDate: event.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        
        // Keep existing dates for compatibility
        startDate: event.startDate || new Date(),
        endDate: event.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        
        // Add basic type and status fields if missing
        type: event.type || 'Attraction',
        status: event.status || 'Active',
        
        // Make sure the event has a URL
        sourceURL: event.sourceURL || event.source_url || 'https://www.toronto.ca/explore-enjoy/festivals-events/',
        
        // Add an explicit "Toronto" mention in the name if not present
        name: event.name || event.title || 'Toronto Event'
      };
      
      if (!event.name?.toLowerCase().includes('toronto') && !updateFields.name.toLowerCase().includes('toronto')) {
        updateFields.name = `${updateFields.name} (Toronto)`;
      }
      
      // Update the event document
      const result = await eventsCollection.updateOne(
        { _id: event._id }, 
        { $set: updateFields }
      );
      
      if (result.modifiedCount > 0) {
        updateCount++;
      }
    }
    
    console.log(`✅ Updated ${updateCount} out of ${torontoEvents.length} Toronto events to match SeasonalActivity structure`);
    
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
