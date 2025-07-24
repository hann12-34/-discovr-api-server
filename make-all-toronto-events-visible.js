/**
 * Script to ensure all Toronto events are visible in the app
 * by fixing their structure to match exactly what the app expects.
 */
const { MongoClient } = require('mongodb');

async function fixTorontoEvents() {
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
        { city: { $regex: 'Toronto', $options: 'i' } },
        { location: { $regex: 'Toronto', $options: 'i' } },
        { name: { $regex: 'Toronto', $options: 'i' } },
        { title: { $regex: 'Toronto', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${torontoEvents.length} Toronto events to update`);
    
    // Fix all Toronto events to ensure they pass the filter
    let updateCount = 0;
    for (const event of torontoEvents) {
      // Critical fixes based on app's filtering logic
      const updateFields = {
        // 1. Fix venue to be a string instead of an object
        venue: typeof event.venue === 'string' ? event.venue : 'Toronto',
        
        // 2. Ensure location has Toronto at the BEGINNING (for city extraction)
        location: event.location && typeof event.location === 'string' && event.location.toLowerCase().includes('toronto') 
          ? 'Toronto - ' + event.location
          : 'Toronto, ' + (event.location || 'Downtown'),
        
        // 3. Make sure name explicitly contains Toronto
        name: event.name && typeof event.name === 'string' && event.name.toLowerCase().includes('toronto') 
          ? event.name 
          : 'Toronto - ' + (event.name || event.title || 'Event'),
          
        // 4. Add Toronto to title if not already there
        title: event.title && typeof event.title === 'string' && event.title.toLowerCase().includes('toronto')
          ? event.title
          : 'Toronto - ' + (event.title || event.name || 'Event'),
        
        // 5. Explicitly add Toronto as the city field
        city: 'Toronto'
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
    
    console.log(`✅ Updated ${updateCount} out of ${torontoEvents.length} Toronto events to ensure visibility`);
    
    // Print example of an updated event
    if (torontoEvents.length > 0) {
      const updatedEvent = await eventsCollection.findOne({ _id: torontoEvents[0]._id });
      console.log('📝 Example of updated event:');
      console.log(JSON.stringify(updatedEvent, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error fixing Toronto events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixTorontoEvents().catch(console.error);
