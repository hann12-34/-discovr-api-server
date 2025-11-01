/**
 * LIST ALL DATABASES AND COLLECTIONS
 */

const { MongoClient } = require('mongodb');

async function listDatabases() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
    
    const client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Connected to MongoDB\n');
    console.log('📊 LISTING ALL DATABASES:\n');
    
    // List all databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    
    for (const db of databases.databases) {
      console.log(`\n📁 Database: ${db.name}`);
      
      if (db.name === 'discovr' || db.name === 'discovr-api-v2') {
        // Get collections in this database
        const database = client.db(db.name);
        const collections = await database.listCollections().toArray();
        console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);
        
        // Count events if events collection exists
        if (collections.some(c => c.name === 'events')) {
          const eventsCount = await database.collection('events').countDocuments({});
          console.log(`   Events count: ${eventsCount}`);
          
          // Sample event
          const sampleEvent = await database.collection('events').findOne({ title: /John Legend/i });
          if (sampleEvent) {
            console.log(`   Sample: "${sampleEvent.title}" - ${sampleEvent.startDate}`);
          }
        }
      }
    }
    
    await client.close();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

listDatabases();
