require('dotenv').config();
const mongoose = require('mongoose');

async function restoreCityAssignments() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔧 RESTORING CORRECT CITY ASSIGNMENTS...');
        console.log('🎯 Strategy: Use venue.city as the authoritative source for city assignment');

        // Step 1: Find all events where city != venue.city
        const corruptedEvents = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    { city: { $exists: true, $ne: null } },
                    { "venue.city": { $exists: true, $ne: null } },
                    { $expr: { $ne: ["$city", "$venue.city"] } }
                ]
            })
            .toArray();

        console.log(`\n📊 Found ${corruptedEvents.length} events with incorrect city assignments`);

        if (corruptedEvents.length === 0) {
            console.log('✅ No corrupted city assignments found!');
            await mongoose.disconnect();
            return;
        }

        // Show examples of what will be fixed
        console.log('\n📝 Examples of events that will be corrected:');
        corruptedEvents.slice(0, 10).forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   INCORRECT city: "${event.city}"`);
            console.log(`   CORRECT venue.city: "${event.venue.city}"`);
            console.log(`   Source: ${event.source || 'undefined'}`);
            console.log('');
        });

        // Group by correction type for summary
        const corrections = {};
        corruptedEvents.forEach(event => {
            const key = `${event.city} → ${event.venue.city}`;
            if (!corrections[key]) {
                corrections[key] = 0;
            }
            corrections[key]++;
        });

        console.log('\n📋 CORRECTION SUMMARY:');
        Object.entries(corrections).forEach(([correction, count]) => {
            console.log(`${correction}: ${count} events`);
        });

        console.log('\n🔄 Applying corrections...');

        // Step 2: Update all corrupted events to use venue.city as the authoritative city
        const bulkOps = [];
        for (const event of corruptedEvents) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: event._id },
                    update: { $set: { city: event.venue.city } }
                }
            });
        }

        let modifiedCount = 0;
        if (bulkOps.length > 0) {
            const result = await mongoose.connection.db.collection('events').bulkWrite(bulkOps);
            modifiedCount = result.modifiedCount;
        }

        console.log('\n✅ RESTORATION COMPLETED!');
        console.log(`📊 Corrected ${modifiedCount} events`);

        // Step 3: Verify the fix
        const remainingCorrupted = await mongoose.connection.db.collection('events')
            .countDocuments({
                $and: [
                    { city: { $exists: true, $ne: null } },
                    { "venue.city": { $exists: true, $ne: null } },
                    { $expr: { $ne: ["$city", "$venue.city"] } }
                ]
            });

        if (remainingCorrupted === 0) {
            console.log('🎉 SUCCESS: All city assignments are now consistent!');
        } else {
            console.log(`⚠️  Warning: ${remainingCorrupted} events still have mismatched city assignments`);
        }

        // Step 4: Show final city distribution
        console.log('\n📊 FINAL CITY DISTRIBUTION:');
        const finalCityStats = await mongoose.connection.db.collection('events').aggregate([
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

        finalCityStats.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} events`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        console.log('\n🚀 City assignments have been restored! Your mobile app should now show correct event counts.');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

console.log('🚨 URGENT: Restoring correct city assignments...');
console.log('🎯 Fixing data corruption caused by previous city standardization');
restoreCityAssignments();
