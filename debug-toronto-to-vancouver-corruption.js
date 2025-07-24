require('dotenv').config();
const mongoose = require('mongoose');

async function findTorontoVancouverCorruption() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Look for events that should be Toronto but are assigned to Vancouver
        console.log('\n=== TORONTO EVENTS INCORRECTLY ASSIGNED TO VANCOUVER ===');
        
        // Check by source field (Toronto scrapers)
        const torontoSourceEvents = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    { city: "Vancouver" },
                    {
                        $or: [
                            { source: { $regex: /toronto/i } },
                            { source: { $regex: /ROM/i } },
                            { source: { $regex: /guild/i } },
                            { source: { $regex: /poetry.*jazz/i } },
                            { source: { $regex: /revival/i } }
                        ]
                    }
                ]
            })
            .limit(20)
            .toArray();

        console.log(`Found ${torontoSourceEvents.length} events with Toronto sources but Vancouver city:`);
        torontoSourceEvents.forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   venue.city: "${event.venue?.city}"`);
            console.log(`   source: "${event.source}"`);
            console.log('');
        });

        // Check by venue address containing Toronto
        const torontoVenueEvents = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    { city: "Vancouver" },
                    {
                        $or: [
                            { "venue.address": { $regex: /toronto/i } },
                            { "venue.address": { $regex: /ontario/i } },
                            { "venue.address": { $regex: /ON\s/i } }
                        ]
                    }
                ]
            })
            .limit(20)
            .toArray();

        console.log(`\n=== EVENTS WITH TORONTO/ONTARIO ADDRESSES BUT VANCOUVER CITY ===`);
        console.log(`Found ${torontoVenueEvents.length} events with Toronto/Ontario addresses but Vancouver city:`);
        torontoVenueEvents.forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   venue.city: "${event.venue?.city}"`);
            console.log(`   venue.address: "${event.venue?.address}"`);
            console.log(`   source: "${event.source}"`);
            console.log('');
        });

        // Get current city distribution
        console.log('\n=== CURRENT CITY DISTRIBUTION ===');
        const cityStats = await mongoose.connection.db.collection('events').aggregate([
            {
                $group: {
                    _id: "$city",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        cityStats.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} events`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🔍 Finding Toronto events incorrectly assigned to Vancouver...');
findTorontoVancouverCorruption();
