const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://seongwoo:Tpdhkstpdhk12!@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'discovr';
const COLLECTION_NAME = 'events';

async function deleteAllTorontoEvents() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Count Toronto events
    const count = await collection.countDocuments({
      'venue.city': 'Toronto'
    });
    
    console.log(`\n🔍 Found ${count} Toronto events`);
    
    if (count === 0) {
      console.log('✅ No Toronto events found!');
      return;
    }
    
    console.log(`\n🗑️  Deleting all Toronto events...`);
    
    const result = await collection.deleteMany({
      'venue.city': 'Toronto'
    });
    
    console.log(`✅ Deleted ${result.deletedCount} Toronto events`);
    
    // Verify
    const remaining = await collection.countDocuments({
      'venue.city': 'Toronto'
    });
    
    console.log(`\n📊 Remaining Toronto events: ${remaining}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

deleteAllTorontoEvents();
