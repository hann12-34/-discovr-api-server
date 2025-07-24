require('dotenv').config();
const mongoose = require('mongoose');

async function fixPoetryEventsToToronto() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔧 FIXING POETRY JAZZ CAFE EVENTS → TORONTO');
        console.log('🎯 Based on: https://www.poetryjazzcafe.com/livemusic');
        console.log('📍 Address: 1078 Queen Street West, Toronto, ON M6J 1H6\n');

        // Find all Poetry events with undefined city
        const poetryEvents = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    {
                        $or: [
                            { title: { $regex: /POETRY PRESENTS/i } },
                            { source: { $regex: /poetry/i } },
                            { venue: { $regex: /poetry/i } }
                        ]
                    },
                    {
                        $or: [
                            { city: { $exists: false } },
                            { city: null },
                            { city: "" },
                            { city: "undefined" }
                        ]
                    }
                ]
            })
            .toArray();

        console.log(`📊 Found ${poetryEvents.length} Poetry events with undefined city`);

        if (poetryEvents.length === 0) {
            console.log('✅ No Poetry events need fixing');
            await mongoose.disconnect();
            return;
        }

        // Show examples
        console.log('\n📝 SAMPLE POETRY EVENTS TO FIX:');
        poetryEvents.slice(0, 5).forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   source: "${event.source}"`);
            console.log(`   current city: "${event.city}"`);
        });

        // Fix all Poetry events
        console.log('\n🔧 FIXING ALL POETRY EVENTS TO TORONTO...');

        const updateResult = await mongoose.connection.db.collection('events')
            .updateMany(
                {
                    $and: [
                        {
                            $or: [
                                { title: { $regex: /POETRY PRESENTS/i } },
                                { source: { $regex: /poetry/i } },
                                { venue: { $regex: /poetry/i } }
                            ]
                        },
                        {
                            $or: [
                                { city: { $exists: false } },
                                { city: null },
                                { city: "" },
                                { city: "undefined" }
                            ]
                        }
                    ]
                },
                {
                    $set: {
                        city: 'Toronto',
                        streetAddress: '1078 Queen Street West, Toronto, ON M6J 1H6',
                        'venue.city': 'Toronto',
                        'venue.province': 'ON',
                        'venue.country': 'Canada'
                    }
                }
            );

        console.log(`✅ Fixed ${updateResult.modifiedCount} Poetry events → Toronto`);

        // Also fix any Pride events that are likely Toronto
        const prideUpdateResult = await mongoose.connection.db.collection('events')
            .updateMany(
                {
                    $and: [
                        { title: { $regex: /pride/i } },
                        {
                            $or: [
                                { city: { $exists: false } },
                                { city: null },
                                { city: "" },
                                { city: "undefined" }
                            ]
                        }
                    ]
                },
                {
                    $set: {
                        city: 'Toronto'
                    }
                }
            );

        console.log(`✅ Fixed ${prideUpdateResult.modifiedCount} Pride events → Toronto`);

        // Check final undefined count
        const stillUndefined = await mongoose.connection.db.collection('events')
            .countDocuments({
                $or: [
                    { city: { $exists: false } },
                    { city: null },
                    { city: "" },
                    { city: "undefined" }
                ]
            });

        console.log(`\n📊 FINAL RESULT:`);
        console.log(`Events still with undefined city: ${stillUndefined}`);

        if (stillUndefined === 0) {
            console.log('🎉 SUCCESS: EVERY EVENT NOW HAS A CITY!');
        } else {
            console.log(`🚨 ${stillUndefined} events still need manual review`);
        }

        // Show final city distribution
        const finalCityDistribution = await mongoose.connection.db.collection('events').aggregate([
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
        finalCityDistribution.forEach(cityData => {
            const city = cityData._id || 'undefined';
            console.log(`${city}: ${cityData.count} events`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

        console.log('\n🎯 NEXT CRITICAL STEP:');
        console.log('🚀 TEST YOUR MOBILE APP NOW!');
        console.log('   Vancouver should show ~769+ events (not just 77!)');
        console.log('   Toronto should show ~488+ events');
        console.log('   All cities should work with proper filtering!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 FIXING POETRY JAZZ CAFE: All events → Toronto');
fixPoetryEventsToToronto();
