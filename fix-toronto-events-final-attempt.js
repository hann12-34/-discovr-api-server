/**
 * Final comprehensive fix for Toronto events
 * - Identifies working event formats
 * - Applies those exact formats to all Toronto events
 */
const { MongoClient } = require('mongodb');

async function finalTorontoEventFix() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // 1. Find the event that works (appears in the app)
    // This is likely the BC Lions vs Toronto event based on the screenshot
    const workingEvent = await eventsCollection.findOne({
      name: { $regex: "BC Lions vs. Toronto", $options: "i" }
    });
    
    console.log('✅ Found working event model:');
    console.log(JSON.stringify(workingEvent, null, 2));
    
    // 2. Find all Toronto events
    const torontoEvents = await eventsCollection.find({
      $and: [
        { 
          $or: [
            { city: "Toronto" },
            { name: { $regex: "Toronto", $options: "i" } },
            { location: { $regex: "Toronto", $options: "i" } }
          ] 
        },
        // Exclude the working event itself
        { _id: { $ne: workingEvent._id } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${torontoEvents.length} Toronto events to fix`);
    
    // 3. Update all Toronto events using the working model
    let updateCount = 0;
    for (const event of torontoEvents) {
      // Create a standardized event object based on the working event
      const updateFields = {
        // Keep event-specific fields
        id: event.id,
        name: event.name,
        description: event.description,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        
        // Apply working event structure
        // Toronto in the name at the beginning
        name: event.name.toLowerCase().includes('toronto') ? 
          event.name : `Toronto - ${event.name}`,
          
        // City fields exactly as in working event
        city: workingEvent.city,
        
        // Location format matching working event
        location: `Toronto, Downtown`,
        
        // Venue as a simple string
        venue: "Toronto",
        
        // Categories matching working event
        category: event.category || workingEvent.category,
        categories: workingEvent.categories,
        
        // Dates in the exact same format
        dateRange: {
          startDate: event.startDate,
          endDate: event.endDate
        },
        
        // Other fields from working event
        lastUpdated: new Date(),
        createdAt: event.createdAt || new Date(),
        updatedAt: new Date()
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
    
    console.log(`✅ Updated ${updateCount} out of ${torontoEvents.length} Toronto events to match working model`);
    
  } catch (error) {
    console.error('❌ Error fixing Toronto events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

finalTorontoEventFix().catch(console.error);
