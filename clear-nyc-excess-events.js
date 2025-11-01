/**
 * Clear excess NYC events caused by duplicate UUID generation
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function clearExcessNYCEvents() {
    console.log('🧹 Clearing excess NYC events...');
    
    let client;
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        // Count current NYC events
        const currentCount = await collection.countDocuments({ 
            $or: [
                { city: 'New York' },
                { 'venue.city': 'New York' },
                { city: { $regex: /new york/i } }
            ]
        });
        
        console.log(`📊 Current NYC events: ${currentCount}`);
        
        // Delete all NYC events
        const deleteResult = await collection.deleteMany({ 
            $or: [
                { city: 'New York' },
                { 'venue.city': 'New York' },
                { city: { $regex: /new york/i } }
            ]
        });
        
        console.log(`🗑️  Deleted ${deleteResult.deletedCount} NYC events`);
        console.log('✅ NYC database cleared - ready for clean import');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

clearExcessNYCEvents();
