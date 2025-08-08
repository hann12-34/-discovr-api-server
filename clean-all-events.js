const { MongoClient } = require('mongodb');

// Set the MongoDB URI
const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function cleanAllEvents() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('test');
        const collection = db.collection('events');
        
        // Get count before cleaning
        const beforeCount = await collection.countDocuments();
        console.log(`📊 Total events before cleaning: ${beforeCount}`);
        
        // Delete ALL events
        const result = await collection.deleteMany({});
        
        console.log(`🗑️  Deleted ${result.deletedCount} events`);
        
        // Verify count after cleaning
        const afterCount = await collection.countDocuments();
        console.log(`📊 Total events after cleaning: ${afterCount}`);
        
        if (afterCount === 0) {
            console.log('✅ Database completely cleaned! Ready for fresh sample scraper imports.');
        } else {
            console.log(`⚠️  Warning: ${afterCount} events still remain in database.`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

cleanAllEvents();
