/**
 * Check the actual number of events in the cloud MongoDB
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkEventsCount() {
  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('❌ Error: MONGODB_URI not found in .env file');
    return;
  }
  
  const client = new MongoClient(mongoURI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Count all events
    const totalCount = await eventsCollection.countDocuments({});
    console.log(`📊 Total events in database: ${totalCount}`);
    
    // Count Toronto events
    const torontoCount = await eventsCollection.countDocuments({ city: 'Toronto' });
    console.log(`🏙️ Toronto events: ${torontoCount}`);
    
    // Get the most recent 5 Toronto events
    const recentTorontoEvents = await eventsCollection
      .find({ city: 'Toronto' })
      .sort({ _id: -1 })
      .limit(5)
      .toArray();
      
    console.log('\n📝 Latest 5 Toronto events:');
    recentTorontoEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.name} (${event.venue || 'No venue'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkEventsCount().catch(console.error);
