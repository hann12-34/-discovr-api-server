require('dotenv').config();
const mongoose = require('mongoose');

async function debugExactCityValues() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get exact city values for Calgary events
        const calgaryEvents = await mongoose.connection.db.collection('events')
            .find({ city: "Calgary" })
            .limit(5)
            .toArray();

        console.log('\n=== CALGARY EVENTS - EXACT VALUES ===');
        calgaryEvents.forEach((event, index) => {
            console.log(`${index + 1}. Title: "${event.title}"`);
            console.log(`   city: "${event.city}" (length: ${event.city?.length || 0})`);
            console.log(`   venue.city: "${event.venue?.city}" (length: ${event.venue?.city?.length || 0})`);
            
            // Check for any hidden characters
            if (event.city) {
                console.log(`   city bytes: [${Array.from(event.city).map(c => c.charCodeAt(0)).join(', ')}]`);
            }
            console.log('');
        });

        // Get exact city values for Montreal events
        const montrealEvents = await mongoose.connection.db.collection('events')
            .find({ city: "Montreal" })
            .limit(5)
            .toArray();

        console.log('\n=== MONTREAL EVENTS - EXACT VALUES ===');
        montrealEvents.forEach((event, index) => {
            console.log(`${index + 1}. Title: "${event.title}"`);
            console.log(`   city: "${event.city}" (length: ${event.city?.length || 0})`);
            console.log(`   venue.city: "${event.venue?.city}" (length: ${event.venue?.city?.length || 0})`);
            
            // Check for any hidden characters
            if (event.city) {
                console.log(`   city bytes: [${Array.from(event.city).map(c => c.charCodeAt(0)).join(', ')}]`);
            }
            console.log('');
        });

        // Check for case variations
        const cityVariations = await mongoose.connection.db.collection('events').aggregate([
            {
                $match: {
                    city: { $regex: /calgary|montreal/i }
                }
            },
            {
                $group: {
                    _id: "$city",
                    count: { $sum: 1 },
                    sampleTitle: { $first: "$title" }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        console.log('\n=== CITY CASE VARIATIONS ===');
        cityVariations.forEach(variation => {
            console.log(`"${variation._id}": ${variation.count} events (sample: "${variation.sampleTitle}")`);
            if (variation._id) {
                console.log(`   bytes: [${Array.from(variation._id).map(c => c.charCodeAt(0)).join(', ')}]`);
            }
        });

        // Sample some Vancouver and Toronto events that work
        const vancouverSample = await mongoose.connection.db.collection('events')
            .findOne({ city: "Vancouver" });

        const torontoSample = await mongoose.connection.db.collection('events')
            .findOne({ city: "Toronto" });

        console.log('\n=== WORKING CITIES (FOR COMPARISON) ===');
        if (vancouverSample) {
            console.log(`Vancouver: "${vancouverSample.city}" (length: ${vancouverSample.city?.length || 0})`);
            console.log(`   bytes: [${Array.from(vancouverSample.city).map(c => c.charCodeAt(0)).join(', ')}]`);
        }
        if (torontoSample) {
            console.log(`Toronto: "${torontoSample.city}" (length: ${torontoSample.city?.length || 0})`);
            console.log(`   bytes: [${Array.from(torontoSample.city).map(c => c.charCodeAt(0)).join(', ')}]`);
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🔍 Investigating exact city values for mobile app filtering...');
debugExactCityValues();
