/**
 * Script to directly add a simple test Toronto event to the cloud database
 * This is a diagnostic script to verify database connection and event format
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

async function addTestTorontoEvent() {
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
    
    // Create a simple test event with all necessary fields
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14); // 14 days in future
    
    const testEvent = {
      id: uuidv4(),
      name: "Toronto - Test Event " + new Date().toISOString(),
      title: "Toronto - Test Event",
      startDate: futureDate.toISOString(),
      endDate: new Date(futureDate.getTime() + 86400000).toISOString(), // +1 day
      dateRange: {
        start: futureDate.toISOString(),
        end: new Date(futureDate.getTime() + 86400000).toISOString()
      },
      venue: "Toronto",
      location: "Toronto, Ontario",
      city: "Toronto",
      cityId: "Toronto",
      status: "active",
      categories: ["Toronto", "Test"],
      price: "Free",
      scrapeDate: new Date().toISOString(),
      source: "Manual Test"
    };
    
    console.log('\n📝 Event to be added:');
    console.log(JSON.stringify(testEvent, null, 2));
    
    // Insert the event
    const result = await eventsCollection.insertOne(testEvent);
    
    if (result.acknowledged) {
      console.log(`✅ Successfully added test Toronto event with ID: ${result.insertedId}`);
      
      // Verify it exists in the database
      const count = await eventsCollection.countDocuments({ city: "Toronto" });
      console.log(`📊 Toronto events count after insert: ${count}`);
      
      // Check if app can see this event by querying the API routes
      console.log('\n🔍 Checking if the event is visible through API query...');
      
      // Find the event we just added
      const foundEvent = await eventsCollection.findOne({ _id: result.insertedId });
      console.log(foundEvent ? '✅ Event found in direct database query' : '❌ Event not found in database');
      
      // Find events with city=Toronto
      const torontoEvents = await eventsCollection.find({ city: "Toronto" }).toArray();
      console.log(`📊 Found ${torontoEvents.length} Toronto events through direct query`);
      
      if (torontoEvents.length > 0) {
        console.log('📋 Toronto event names:');
        torontoEvents.forEach((event, i) => {
          console.log(`${i+1}. ${event.name}`);
        });
      }
    } else {
      console.error('❌ Failed to add test event');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
    
    console.log('\n🔍 Next steps:');
    console.log('1. Check if the event appears in your Render admin');
    console.log('2. If not, verify your Render environment variables are pointing to the same MongoDB');
    console.log('3. You may need to redeploy your Render application');
  }
}

// Run the function
addTestTorontoEvent().catch(console.error);
