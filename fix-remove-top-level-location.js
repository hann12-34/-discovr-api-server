require('dotenv').config();
const mongoose = require('mongoose');

async function removeTopLevelLocationFields() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // First, count how many events have top-level location field
        const eventsWithLocation = await mongoose.connection.db.collection('events')
            .find({ location: { $exists: true } })
            .toArray();

        console.log(`\n📊 Found ${eventsWithLocation.length} events with top-level 'location' field`);

        if (eventsWithLocation.length === 0) {
            console.log('✅ No events with top-level location field found. Nothing to fix!');
            await mongoose.disconnect();
            return;
        }

        // Show some examples before removal
        console.log('\n📝 Examples of events that will be modified:');
        eventsWithLocation.slice(0, 5).forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}" - location: "${event.location}"`);
        });

        console.log('\n🔄 Removing top-level location field from all events...');

        // Remove the top-level location field from all events that have it
        const result = await mongoose.connection.db.collection('events').updateMany(
            { location: { $exists: true } },
            { $unset: { location: "" } }
        );

        console.log('\n✅ OPERATION COMPLETED SUCCESSFULLY!');
        console.log(`📊 Modified ${result.modifiedCount} events`);
        console.log(`📊 Matched ${result.matchedCount} events`);

        // Verify the fix by checking if any events still have top-level location field
        const remainingEvents = await mongoose.connection.db.collection('events')
            .countDocuments({ location: { $exists: true } });

        if (remainingEvents === 0) {
            console.log('🎉 SUCCESS: No events with top-level location field remain!');
            console.log('🚀 Mobile app parsing error should now be resolved!');
        } else {
            console.log(`⚠️  Warning: ${remainingEvents} events still have top-level location field`);
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the fix
console.log('🔧 Starting fix for mobile app parsing error...');
console.log('🎯 Removing top-level location fields from event records');
removeTopLevelLocationFields();
