const { MongoClient } = require('mongodb');

// Set the MongoDB URI
const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function checkDatabaseEvents() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('test');
        const collection = db.collection('events');
        
        // Get total count
        const totalCount = await collection.countDocuments();
        console.log(`📊 Total events in database: ${totalCount}`);
        
        // Get city distribution based on venue.name
        const cityDistribution = await collection.aggregate([
            {
                $group: {
                    _id: "$venue.name",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();
        
        console.log('\n🏙️ Events by city (venue.name):');
        cityDistribution.forEach(city => {
            console.log(`  ${city._id}: ${city.count} events`);
        });
        
        // Get source distribution
        const sourceDistribution = await collection.aggregate([
            {
                $group: {
                    _id: "$source",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();
        
        console.log('\n📋 Events by source:');
        sourceDistribution.forEach(source => {
            console.log(`  ${source._id}: ${source.count} events`);
        });
        
        // Sample recent events to verify city tagging
        console.log('\n🔍 Sample recent events:');
        const recentEvents = await collection.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();
            
        recentEvents.forEach((event, index) => {
            console.log(`${index + 1}. ${event.name || 'Untitled'}`);
            console.log(`   City: ${event.venue?.name || 'No city'}`);
            console.log(`   Source: ${event.source || 'No source'}`);
            console.log(`   Created: ${event.createdAt || 'No date'}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

checkDatabaseEvents();
