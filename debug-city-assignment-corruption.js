require('dotenv').config();
const mongoose = require('mongoose');

async function investigateCityCorruption() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check for mismatched city and venue.city fields
        console.log('\n=== CHECKING FOR CITY/VENUE.CITY MISMATCHES ===');
        
        const mismatchedEvents = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    { city: { $exists: true, $ne: null } },
                    { "venue.city": { $exists: true, $ne: null } },
                    { $expr: { $ne: ["$city", "$venue.city"] } }
                ]
            })
            .limit(10)
            .toArray();

        console.log(`Found ${mismatchedEvents.length} events with mismatched city/venue.city fields:`);
        
        mismatchedEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   Top-level city: "${event.city}"`);
            console.log(`   venue.city: "${event.venue?.city}"`);
            console.log(`   Source: ${event.source}`);
        });

        // Check specifically for Toronto events that might have been assigned to Vancouver
        console.log('\n=== LOOKING FOR TORONTO EVENTS ASSIGNED TO VANCOUVER ===');
        
        const suspiciousEvents = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    { city: "Vancouver" },
                    {
                        $or: [
                            { "venue.city": "Toronto" },
                            { source: { $regex: /toronto/i } },
                            { title: { $regex: /toronto/i } }
                        ]
                    }
                ]
            })
            .limit(10)
            .toArray();

        console.log(`Found ${suspiciousEvents.length} suspicious events (city=Vancouver but should be Toronto):`);
        
        suspiciousEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   venue.city: "${event.venue?.city}"`);
            console.log(`   source: "${event.source}"`);
        });

        // Check all venue cities that don't match the main city
        console.log('\n=== VENUE CITIES THAT DO NOT MATCH TOP-LEVEL CITY ===');
        
        const cityMismatchStats = await mongoose.connection.db.collection('events').aggregate([
            {
                $match: {
                    $and: [
                        { city: { $exists: true, $ne: null } },
                        { "venue.city": { $exists: true, $ne: null } },
                        { $expr: { $ne: ["$city", "$venue.city"] } }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        topLevelCity: "$city",
                        venueCity: "$venue.city"
                    },
                    count: { $sum: 1 },
                    sampleTitle: { $first: "$title" }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        console.log('\nMismatch patterns:');
        cityMismatchStats.slice(0, 10).forEach(stat => {
            console.log(`${stat._id.topLevelCity} ← ${stat._id.venueCity}: ${stat.count} events (sample: "${stat.sampleTitle}")`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 Investigating city assignment corruption...');
investigateCityCorruption();
