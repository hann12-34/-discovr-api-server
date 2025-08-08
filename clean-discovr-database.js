// Load the same environment config that the admin interface uses
require('./temp-env-config.js');

const { MongoClient } = require('mongodb');

// Use the EXACT same MongoDB URI that the admin interface uses
const MONGODB_URI = process.env.MONGODB_URI;

async function cleanDiscovrDatabase() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        console.log(`📡 Database URI: ${MONGODB_URI}`);
        
        // Target the DISCOVR database which has the 59 events
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        // Get count before cleaning
        const beforeCount = await collection.countDocuments();
        console.log(`📊 Total events before cleaning (discovr.events): ${beforeCount}`);
        
        if (beforeCount === 0) {
            console.log('⚠️  No events found in discovr.events collection');
            return;
        }
        
        // Delete ALL events from discovr database
        const result = await collection.deleteMany({});
        
        console.log(`🗑️  Deleted ${result.deletedCount} events from discovr.events`);
        
        // Verify count after cleaning
        const afterCount = await collection.countDocuments();
        console.log(`📊 Total events after cleaning: ${afterCount}`);
        
        if (afterCount === 0) {
            console.log('✅ DISCOVR database completely cleaned! Admin interface should now show 0 events.');
        } else {
            console.log(`⚠️  Warning: ${afterCount} events still remain in discovr database.`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

cleanDiscovrDatabase();
