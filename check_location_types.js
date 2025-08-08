const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

async function checkLocationTypes() {
    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        // Get total count
        const totalCount = await collection.countDocuments();
        console.log(`\nTotal events in database: ${totalCount}`);
        
        // Count events where location is a string
        const stringLocationCount = await collection.countDocuments({
            location: { $type: "string" }
        });
        console.log(`Events with location as string: ${stringLocationCount}`);
        
        // Count events where location is an object
        const objectLocationCount = await collection.countDocuments({
            location: { $type: "object" }
        });
        console.log(`Events with location as object: ${objectLocationCount}`);
        
        // Count events where location is null or missing
        const nullLocationCount = await collection.countDocuments({
            $or: [
                { location: null },
                { location: { $exists: false } }
            ]
        });
        console.log(`Events with location null/missing: ${nullLocationCount}`);
        
        console.log('\n=== SAMPLE EVENTS WITH OBJECT LOCATION ===');
        
        // Get sample events where location is an object
        const objectLocationEvents = await collection.find({
            location: { $type: "object" }
        }).limit(5).toArray();
        
        objectLocationEvents.forEach((event, index) => {
            console.log(`\nEvent ${index + 1}:`);
            console.log(`  ID: ${event.id}`);
            console.log(`  Title: ${event.title}`);
            console.log(`  Location type: ${typeof event.location}`);
            console.log(`  Location value:`, JSON.stringify(event.location, null, 2));
        });
        
        console.log('\n=== LOOKING FOR EVENT AT INDEX 234 ===');
        
        // Get all events and check the one at index 234
        const allEvents = await collection.find({}).toArray();
        if (allEvents.length > 234) {
            const event234 = allEvents[234];
            console.log(`\nEvent at index 234:`);
            console.log(`  ID: ${event234.id}`);
            console.log(`  Title: ${event234.title}`);
            console.log(`  Location type: ${typeof event234.location}`);
            console.log(`  Location value:`, JSON.stringify(event234.location, null, 2));
        } else {
            console.log(`\nDatabase only has ${allEvents.length} events, no event at index 234`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkLocationTypes();
