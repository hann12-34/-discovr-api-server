const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

async function fixLocationObjects() {
    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        // Find all events where location is an object
        const objectLocationEvents = await collection.find({
            location: { $type: "object" }
        }).toArray();
        
        console.log(`\nFound ${objectLocationEvents.length} events with object location`);
        
        if (objectLocationEvents.length === 0) {
            console.log('No events to fix!');
            return;
        }
        
        console.log('\n=== EVENTS TO BE FIXED ===');
        objectLocationEvents.forEach((event, index) => {
            console.log(`${index + 1}. ID: ${event.id}`);
            console.log(`   Title: ${event.title}`);
            console.log(`   Current location:`, JSON.stringify(event.location));
        });
        
        console.log('\n=== PERFORMING REPAIR ===');
        
        // Fix each event by converting object location to string
        const bulkOperations = objectLocationEvents.map(event => {
            return {
                updateOne: {
                    filter: { _id: event._id },
                    update: {
                        $set: {
                            location: "See venue details" // Convert all object locations to standard string
                        }
                    }
                }
            };
        });
        
        if (bulkOperations.length > 0) {
            const result = await collection.bulkWrite(bulkOperations);
            console.log(`✅ Successfully updated ${result.modifiedCount} events`);
            console.log(`   Matched: ${result.matchedCount}`);
            console.log(`   Modified: ${result.modifiedCount}`);
        }
        
        // Verify the fix
        console.log('\n=== VERIFICATION ===');
        const remainingObjectLocations = await collection.countDocuments({
            location: { $type: "object" }
        });
        
        const stringLocations = await collection.countDocuments({
            location: { $type: "string" }
        });
        
        console.log(`Events with object location after fix: ${remainingObjectLocations}`);
        console.log(`Events with string location after fix: ${stringLocations}`);
        
        if (remainingObjectLocations === 0) {
            console.log('🎉 All location fields are now strings!');
        } else {
            console.log(`❌ Still ${remainingObjectLocations} events with object locations`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

fixLocationObjects();
