const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://seongwoohan:Tpdhkstpdhk12!@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'discovr';
const COLLECTION_NAME = 'events';

async function deleteMalformedEvents() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // First, count how many malformed events exist
    const count = await collection.countDocuments({
      $or: [
        { date: { $type: "object" } },
        { date: { $type: "array" } }
      ]
    });
    
    console.log(`\n🔍 Found ${count} events with malformed date fields (objects/arrays instead of strings)`);
    
    if (count === 0) {
      console.log('✅ No malformed events found!');
      return;
    }
    
    console.log(`\n🗑️  Deleting ${count} malformed events...`);
    
    const result = await collection.deleteMany({
      $or: [
        { date: { $type: "object" } },
        { date: { $type: "array" } }
      ]
    });
    
    console.log(`✅ Deleted ${result.deletedCount} malformed events`);
    
    // Verify they're gone
    const remainingCount = await collection.countDocuments({
      $or: [
        { date: { $type: "object" } },
        { date: { $type: "array" } }
      ]
    });
    
    console.log(`\n📊 Remaining malformed events: ${remainingCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

deleteMalformedEvents();
