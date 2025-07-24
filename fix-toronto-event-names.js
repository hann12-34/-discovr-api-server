/**
 * Script to fix Toronto events with template strings in their names
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixTorontoEventNames() {
  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('❌ Error: MONGODB_URI not found in .env file');
    return;
  }
  
  console.log(`🔌 Connecting to MongoDB: ${mongoURI.substring(0, 25)}...`);
  const client = new MongoClient(mongoURI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Find events with template strings in their names
    const templateRegex = /\{\{.*?\}\}/;
    const brokenEvents = await eventsCollection.find({
      name: { $regex: templateRegex },
      city: "Toronto"
    }).toArray();
    
    console.log(`🔍 Found ${brokenEvents.length} Toronto events with template strings in names`);
    
    if (brokenEvents.length > 0) {
      console.log('📋 Broken event names:');
      brokenEvents.forEach((event, i) => {
        console.log(`${i+1}. ${event.name}`);
      });
      
      // Fix each broken event
      let fixedCount = 0;
      for (const event of brokenEvents) {
        // Extract title from the event if possible, or create a generic name
        let newName = '';
        
        if (event.title && !event.title.includes('{{')) {
          // Use the title if it's available and doesn't have template strings
          newName = `Toronto - ${event.title}`;
        } else {
          // Create a generic name with a timestamp
          const eventType = event.category || event.type || 'Event';
          newName = `Toronto - ${eventType} ${new Date().toISOString().split('T')[0]}`;
        }
        
        console.log(`🔧 Fixing: "${event.name}" -> "${newName}"`);
        
        // Update the event name
        const result = await eventsCollection.updateOne(
          { _id: event._id },
          { $set: { 
              name: newName,
              // Also ensure other fields are correctly set
              city: "Toronto",
              cityId: "Toronto",
              status: "active"
            } 
          }
        );
        
        if (result.modifiedCount > 0) {
          fixedCount++;
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} Toronto event names`);
    } else {
      console.log('✅ No Toronto events with template strings found');
    }
    
    // Verify all Toronto events now
    const torontoEvents = await eventsCollection.find({ city: "Toronto" }).toArray();
    console.log(`📊 Total Toronto events: ${torontoEvents.length}`);
    
    if (torontoEvents.length > 0) {
      console.log('📋 Toronto event names:');
      torontoEvents.forEach((event, i) => {
        console.log(`${i+1}. ${event.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the function
fixTorontoEventNames().catch(console.error);
