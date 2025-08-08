/**
 * Clear All Events Script
 * 
 * This script connects to the MongoDB database and removes all documents from the 'events' collection.
 * It is intended for a complete reset of the event data.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Error: MONGODB_URI is not defined in the .env file.');
  process.exit(1);
}

const client = new MongoClient(uri);

async function clearAllEvents() {
  try {
    console.log('🔄 Connecting to MongoDB to clear events...');
    await client.connect();
    console.log('✅ Connected to MongoDB.');

    const database = client.db('discovr');
    const eventsCollection = database.collection('events');

    console.log('🗑️  Removing all events from the collection...');
    const deleteResult = await eventsCollection.deleteMany({});
    
    console.log(`✅ Successfully removed ${deleteResult.deletedCount} events.`);

  } catch (error) {
    console.error('❌ An error occurred while clearing events:', error);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB.');
  }
}

clearAllEvents();
