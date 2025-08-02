require('dotenv').config();
const { MongoClient } = require('mongodb');

async function addEventIdIndex() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('discovr');
    const collection = db.collection('events');

    console.log('✅ Connected to cloud database.');
    console.log('Attempting to add an index to the `id` field in the `events` collection...');

    // The field being queried is `id`, so we will index it.
    const indexName = await collection.createIndex({ id: 1 }, { name: 'event_id_index' });

    console.log(`✅ Successfully created index: ${indexName}`);
    console.log('Event detail loading should now be much faster.');

  } catch (err) {
    if (err.codeName === 'IndexOptionsConflict' || err.codeName === 'IndexKeySpecsConflict') {
        console.log('⚠️ Index already exists on the cloud database. No action needed.');
    } else {
        console.error('❌ Error creating index:', err);
    }
  } finally {
    await client.close();
  }
}

addEventIdIndex();
