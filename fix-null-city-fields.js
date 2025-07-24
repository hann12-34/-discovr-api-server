require('dotenv').config();
const mongoose = require('mongoose');

async function fixNullCityFields() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🚨 FIXING NULL/UNDEFINED CITY FIELDS');
        console.log('🎯 This is likely causing mobile app to show events under Vancouver\n');

        // Find all events with null, undefined, or "undefined" city fields
        const nullCityEvents = await mongoose.connection.db.collection('events')
            .find({
                $or: [
                    { city: null },
                    { city: { $exists: false } },
                    { city: "undefined" },
                    { city: "" }
                ]
            })
            .toArray();

        console.log(`📊 Found ${nullCityEvents.length} events with null/undefined city fields`);

        if (nullCityEvents.length === 0) {
            console.log('✅ No null city fields found!');
            await mongoose.disconnect();
            return;
        }

        // Analyze sources to determine cities
        const sourceToCity = {};
        nullCityEvents.forEach(event => {
            const source = event.source || 'unknown';
            if (!sourceToCity[source]) {
                sourceToCity[source] = [];
            }
            sourceToCity[source].push({
                title: event.title,
                venueCity: event.venue?.city,
                address: event.venue?.address
            });
        });

        console.log('\n📋 SOURCES WITH NULL CITY EVENTS:');
        Object.entries(sourceToCity).forEach(([source, events]) => {
            console.log(`\nSource: "${source}" (${events.length} events)`);
            events.slice(0, 3).forEach(event => {
                console.log(`  "${event.title}"`);
                console.log(`    venue.city: "${event.venueCity}"`);
                console.log(`    address: "${event.address}"`);
            });
        });

        // Strategy: Use venue.city if available, otherwise infer from source or address
        const bulkOps = [];
        let fixedCount = 0;

        for (const event of nullCityEvents) {
            let newCity = null;

            // Strategy 1: Use venue.city if it exists and is valid
            if (event.venue?.city && event.venue.city !== "undefined" && event.venue.city !== "") {
                newCity = event.venue.city;
            }
            // Strategy 2: Infer from source
            else if (event.source) {
                const source = event.source.toLowerCase();
                if (source.includes('toronto') || source.includes('revival') || source.includes('rom') || 
                    source.includes('guild') || source.includes('poetry')) {
                    newCity = "Toronto";
                }
                else if (source.includes('calgary') || source.includes('stampede') || source.includes('palace')) {
                    newCity = "Calgary";
                }
                else if (source.includes('vancouver') || source.includes('bc ') || source.includes('hello')) {
                    newCity = "Vancouver";
                }
                else if (source.includes('montreal') || source.includes('lepointdevente') || source.includes('newspeak')) {
                    newCity = "Montreal";
                }
            }
            // Strategy 3: Infer from venue address
            else if (event.venue?.address) {
                const address = event.venue.address.toLowerCase();
                if (address.includes('toronto') || address.includes(' on ') || address.includes('ontario')) {
                    newCity = "Toronto";
                }
                else if (address.includes('calgary') || address.includes(' ab ') || address.includes('alberta')) {
                    newCity = "Calgary";
                }
                else if (address.includes('vancouver') || address.includes(' bc ') || address.includes('british columbia')) {
                    newCity = "Vancouver";
                }
                else if (address.includes('montreal') || address.includes(' qc ') || address.includes('quebec')) {
                    newCity = "Montreal";
                }
            }

            if (newCity) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: event._id },
                        update: { $set: { city: newCity } }
                    }
                });
                fixedCount++;
            }
        }

        console.log(`\n🔄 Applying fixes for ${fixedCount} events...`);

        if (bulkOps.length > 0) {
            const result = await mongoose.connection.db.collection('events').bulkWrite(bulkOps);
            console.log(`✅ Updated ${result.modifiedCount} events`);
        }

        // Show remaining null events that couldn't be fixed
        const remainingNull = await mongoose.connection.db.collection('events')
            .countDocuments({
                $or: [
                    { city: null },
                    { city: { $exists: false } },
                    { city: "undefined" },
                    { city: "" }
                ]
            });

        console.log(`\n📊 Remaining null city events: ${remainingNull}`);

        // Final city distribution
        const finalStats = await mongoose.connection.db.collection('events').aggregate([
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

        console.log('\n📊 FINAL CITY DISTRIBUTION:');
        finalStats.forEach(stat => {
            console.log(`${stat._id || 'null'}: ${stat.count} events`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        console.log('\n🚀 Null city fields fixed! Test your mobile app now!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 URGENT: Fixing null/undefined city fields causing mobile app issues');
fixNullCityFields();
