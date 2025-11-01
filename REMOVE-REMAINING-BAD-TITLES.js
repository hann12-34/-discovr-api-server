require('dotenv').config();
const { MongoClient } = require('mongodb');

async function removeRemainingBadTitles() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    console.log('🔍 Finding remaining bad titles...\n');
    
    const badTitles = await collection.find({
      $or: [
        { title: { $regex: /^\(map\)$/i } },
        { title: { $regex: /^google calendar$/i } },
        { title: { $regex: /^map$/i } }
      ]
    }).toArray();
    
    console.log(`Found ${badTitles.length} bad titles:\n`);
    badTitles.slice(0, 10).forEach((event, i) => {
      console.log(`${i+1}. "${event.title}" - ${event.city} - ${event.venue?.name}`);
    });
    
    console.log(`\n🗑️  Deleting all ${badTitles.length} bad titles...`);
    const result = await collection.deleteMany({
      $or: [
        { title: { $regex: /^\(map\)$/i } },
        { title: { $regex: /^google calendar$/i } },
        { title: { $regex: /^map$/i } }
      ]
    });
    
    console.log(`✅ Deleted ${result.deletedCount} events`);
    
    // Final verification
    const remaining = await collection.countDocuments({
      $or: [
        { title: { $regex: /^\(map\)$/i } },
        { title: { $regex: /^google calendar$/i } }
      ]
    });
    
    if (remaining === 0) {
      console.log('\n✅ All bad titles removed!');
    } else {
      console.log(`\n⚠️  Still ${remaining} bad titles`);
    }
    
    console.log('\n📊 Final counts:');
    console.log(`   Total: ${await collection.countDocuments({})}`);
    console.log(`   Calgary: ${await collection.countDocuments({ city: 'Calgary' })}`);
    console.log(`   Montreal: ${await collection.countDocuments({ city: 'Montreal' })}`);
    console.log(`   NYC: ${await collection.countDocuments({ city: 'New York' })}`);
    
  } finally {
    await client.close();
  }
}

removeRemainingBadTitles().catch(console.error);
