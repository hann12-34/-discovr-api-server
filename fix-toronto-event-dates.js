/**
 * Fix Toronto event dates to ensure they all appear in the app's future events list
 */
const { MongoClient } = require('mongodb');

async function fixTorontoEventDates() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Find the working event to see its date format
    const workingEvent = await eventsCollection.findOne({
      name: { $regex: "BC Lions vs. Toronto", $options: "i" }
    });
    
    console.log(`✓ Working event date format: ${workingEvent.startDate}`);
    
    // Find all Toronto events
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Found ${torontoEvents.length} Toronto events to fix dates`);
    
    // Get current date
    const now = new Date();
    
    // Update each Toronto event with a future date
    let updateCount = 0;
    for (const [index, event] of torontoEvents.entries()) {
      // Skip the working event
      if (event._id.toString() === workingEvent._id.toString()) {
        console.log(`⏩ Skipping working event: ${event.name}`);
        continue;
      }
      
      // Create a date 7 days + index days in the future to spread them out
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 7 + index);
      
      // Create end date 3 hours after start date
      const endDate = new Date(futureDate);
      endDate.setHours(endDate.getHours() + 3);
      
      const updateFields = {
        // Update start/end dates to future dates
        startDate: futureDate,
        endDate: endDate,
        
        // Update dateRange to match
        dateRange: {
          startDate: futureDate,
          endDate: endDate
        },
        
        // Make sure status is active
        status: "active",
        
        // Ensure Toronto is first in name/title
        name: event.name.startsWith("Toronto") ? event.name : `Toronto - ${event.name}`,
        title: event.title?.startsWith("Toronto") ? event.title : `Toronto - ${event.title || event.name}`,
        
        // Last updated
        lastUpdated: new Date()
      };
      
      // Update the event
      const result = await eventsCollection.updateOne(
        { _id: event._id },
        { $set: updateFields }
      );
      
      if (result.modifiedCount > 0) {
        updateCount++;
        console.log(`✅ Updated event: ${event.name} with future date: ${futureDate.toISOString()}`);
      }
    }
    
    console.log(`\n📝 Updated ${updateCount} out of ${torontoEvents.length} Toronto events with future dates`);
    
    // Verify dates on Toronto events
    console.log("\n📋 Verifying Toronto events with future dates:");
    const verifiedEvents = await eventsCollection.find({
      city: "Toronto"
    }).sort({ startDate: 1 }).toArray();
    
    verifiedEvents.forEach((event, i) => {
      console.log(`${i+1}. ${event.name} - ${new Date(event.startDate).toLocaleDateString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing Toronto event dates:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixTorontoEventDates().catch(console.error);
