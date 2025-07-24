require('dotenv').config();
const mongoose = require('mongoose');

async function standardizeCityFields() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find events where city is null but venue.city exists
        const eventsToFix = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    { $or: [{ city: null }, { city: { $exists: false } }] },
                    { "venue.city": { $exists: true, $ne: null } }
                ]
            })
            .toArray();

        console.log(`\n📊 Found ${eventsToFix.length} events with missing top-level city field`);

        if (eventsToFix.length === 0) {
            console.log('✅ No events need city field standardization!');
            await mongoose.disconnect();
            return;
        }

        // Show some examples
        console.log('\n📝 Examples of events that will be updated:');
        eventsToFix.slice(0, 5).forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   Current city: ${event.city}`);
            console.log(`   venue.city: ${event.venue?.city}`);
            console.log('');
        });

        console.log('\n🔄 Standardizing city fields...');

        // Update events to have consistent city field
        const bulkOps = [];
        for (const event of eventsToFix) {
            if (event.venue?.city) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: event._id },
                        update: { $set: { city: event.venue.city } }
                    }
                });
            }
        }

        let modifiedCount = 0;
        if (bulkOps.length > 0) {
            const result = await mongoose.connection.db.collection('events').bulkWrite(bulkOps);
            modifiedCount = result.modifiedCount;
        }

        console.log('\n✅ STANDARDIZATION COMPLETED!');
        console.log(`📊 Updated ${modifiedCount} events with city field`);

        // Verify the fix
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

        console.log('\n📊 FINAL CITY DISTRIBUTION:');
        finalCityStats.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} events`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🔧 Standardizing city fields for better mobile app filtering...');
standardizeCityFields();
