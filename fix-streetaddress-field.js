require('dotenv').config();
const mongoose = require('mongoose');

async function fixStreetAddressField() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔧 FIXING STREETADDRESS FIELD FROM VENUE.ADDRESS');
        console.log('🎯 Goal: Copy venue.address to streetAddress for all events\n');

        // Find events that have venue.address but missing/undefined streetAddress
        const eventsToFix = await mongoose.connection.db.collection('events')
            .find({
                "venue.address": { $exists: true, $ne: "", $ne: null, $ne: "undefined" },
                $or: [
                    { "streetAddress": { $exists: false } },
                    { "streetAddress": "" },
                    { "streetAddress": null },
                    { "streetAddress": "undefined" }
                ]
            })
            .toArray();

        console.log(`📊 EVENTS TO FIX: ${eventsToFix.length}`);

        if (eventsToFix.length === 0) {
            console.log('✅ No events need fixing!');
            await mongoose.disconnect();
            return;
        }

        // Group by city for reporting
        const eventsByCity = {};
        eventsToFix.forEach(event => {
            const city = event.city || 'unknown';
            if (!eventsByCity[city]) eventsByCity[city] = [];
            eventsByCity[city].push(event);
        });

        console.log('\n📋 EVENTS TO FIX BY CITY:');
        Object.keys(eventsByCity).sort((a, b) => eventsByCity[b].length - eventsByCity[a].length).forEach(city => {
            console.log(`${city}: ${eventsByCity[city].length} events`);
        });

        console.log('\n🔧 APPLYING FIXES...');

        let fixedCount = 0;
        let errorCount = 0;

        for (const event of eventsToFix) {
            try {
                // Copy venue.address to streetAddress
                const updateResult = await mongoose.connection.db.collection('events')
                    .updateOne(
                        { _id: event._id },
                        { 
                            $set: { 
                                streetAddress: event.venue.address 
                            } 
                        }
                    );

                if (updateResult.modifiedCount > 0) {
                    fixedCount++;
                    if (fixedCount % 100 === 0) {
                        console.log(`✅ Fixed ${fixedCount}/${eventsToFix.length} events...`);
                    }
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`❌ Error fixing event ${event._id}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n📊 RESULTS:`);
        console.log(`✅ Successfully fixed: ${fixedCount} events`);
        console.log(`❌ Errors: ${errorCount} events`);

        // Verify the fixes worked
        console.log('\n🔍 VERIFYING FIXES...');
        
        const stillMissingCount = await mongoose.connection.db.collection('events')
            .countDocuments({
                $or: [
                    { "streetAddress": { $exists: false } },
                    { "streetAddress": "" },
                    { "streetAddress": null },
                    { "streetAddress": "undefined" }
                ]
            });

        console.log(`📊 Events still missing streetAddress: ${stillMissingCount}`);

        // Show sample of fixed events
        const fixedSamples = await mongoose.connection.db.collection('events')
            .find({
                "venue.address": { $exists: true, $ne: "", $ne: null },
                "streetAddress": { $exists: true, $ne: "", $ne: null, $ne: "undefined" }
            })
            .limit(5)
            .toArray();

        console.log('\n✅ SAMPLE FIXED EVENTS:');
        fixedSamples.forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}" (${event.city})`);
            console.log(`   venue.address: "${event.venue?.address}"`);
            console.log(`   streetAddress: "${event.streetAddress}" ✅`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Update mobile app to always use streetAddress field');
        console.log('2. Update import scripts to always populate streetAddress');
        console.log('3. Test app to verify all events show exact addresses');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 EMERGENCY FIX: Copying venue.address to streetAddress for all events');
fixStreetAddressField();
