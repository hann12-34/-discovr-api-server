require('dotenv').config();
const mongoose = require('mongoose');

async function analyzeCityNames() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all unique city names and their counts
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

        console.log('\n=== ALL CITY NAMES IN DATABASE ===');
        cityStats.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} events`);
        });

        // Check venue.city field too
        const venueCityStats = await mongoose.connection.db.collection('events').aggregate([
            {
                $group: {
                    _id: "$venue.city",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        console.log('\n=== VENUE CITY NAMES IN DATABASE ===');
        venueCityStats.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} events`);
        });

        // Look for Calgary events specifically
        const calgaryEvents = await mongoose.connection.db.collection('events')
            .find({
                $or: [
                    { city: { $regex: /calgary/i } },
                    { "venue.city": { $regex: /calgary/i } }
                ]
            })
            .limit(5)
            .toArray();

        console.log('\n=== CALGARY EVENTS (Sample) ===');
        calgaryEvents.forEach(event => {
            console.log(`"${event.title}"`);
            console.log(`  city: "${event.city}"`);
            console.log(`  venue.city: "${event.venue?.city}"`);
            console.log('');
        });

        // Look for Montreal events specifically  
        const montrealEvents = await mongoose.connection.db.collection('events')
            .find({
                $or: [
                    { city: { $regex: /montreal/i } },
                    { "venue.city": { $regex: /montreal/i } }
                ]
            })
            .limit(5)
            .toArray();

        console.log('\n=== MONTREAL EVENTS (Sample) ===');
        montrealEvents.forEach(event => {
            console.log(`"${event.title}"`);
            console.log(`  city: "${event.city}"`);
            console.log(`  venue.city: "${event.venue?.city}"`);
            console.log('');
        });

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🔍 Analyzing city name variations in the database...');
analyzeCityNames();
