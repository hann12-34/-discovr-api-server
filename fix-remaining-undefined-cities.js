require('dotenv').config();
const mongoose = require('mongoose');

async function fixRemainingUndefinedCities() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔧 FIXING REMAINING 40 EVENTS WITH UNDEFINED CITY');
        console.log('🎯 Goal: Every event MUST have a city - no exceptions!\n');

        // Find all events with undefined city
        const undefinedCityEvents = await mongoose.connection.db.collection('events')
            .find({
                $or: [
                    { city: { $exists: false } },
                    { city: null },
                    { city: "" },
                    { city: "undefined" }
                ]
            })
            .toArray();

        console.log(`📊 Found ${undefinedCityEvents.length} events with undefined city`);

        if (undefinedCityEvents.length === 0) {
            console.log('✅ No events with undefined city - all good!');
            await mongoose.disconnect();
            return;
        }

        console.log('\n🔍 ANALYZING UNDEFINED CITY EVENTS:');

        // Group by source to identify patterns
        const sourceGroups = {};
        undefinedCityEvents.forEach(event => {
            const source = event.source || 'unknown';
            if (!sourceGroups[source]) sourceGroups[source] = [];
            sourceGroups[source].push(event);
        });

        console.log('\n📋 UNDEFINED CITY EVENTS BY SOURCE:');
        Object.keys(sourceGroups).forEach(source => {
            console.log(`${source}: ${sourceGroups[source].length} events`);
        });

        // Show detailed analysis of each event
        console.log('\n📝 DETAILED ANALYSIS OF UNDEFINED CITY EVENTS:');
        undefinedCityEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   source: "${event.source}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   location: "${event.location}"`);
            console.log(`   venue: "${event.venue}"`);
            console.log(`   venue.name: "${event.venue?.name}"`);
            console.log(`   streetAddress: "${event.streetAddress}"`);
            console.log(`   url: "${event.url}"`);
        });

        // Try to infer cities from various fields
        console.log('\n🔧 ATTEMPTING TO FIX CITIES USING AVAILABLE DATA:');

        let fixedCount = 0;
        let unfixableCount = 0;

        for (const event of undefinedCityEvents) {
            let inferredCity = null;
            let reason = '';

            // Strategy 1: Extract from location field
            if (event.location && typeof event.location === 'string') {
                const location = event.location.toLowerCase();
                if (location.includes('vancouver') || location.includes('bc') || location.includes('british columbia')) {
                    inferredCity = 'Vancouver';
                    reason = `location field: "${event.location}"`;
                } else if (location.includes('calgary') || location.includes('alberta') || location.includes('ab')) {
                    inferredCity = 'Calgary';
                    reason = `location field: "${event.location}"`;
                } else if (location.includes('toronto') || location.includes('ontario') || location.includes('on')) {
                    inferredCity = 'Toronto';
                    reason = `location field: "${event.location}"`;
                } else if (location.includes('montreal') || location.includes('quebec') || location.includes('qc')) {
                    inferredCity = 'Montreal';
                    reason = `location field: "${event.location}"`;
                }
            }

            // Strategy 2: Extract from venue name
            if (!inferredCity && event.venue) {
                const venue = (typeof event.venue === 'string' ? event.venue : event.venue?.name || '').toLowerCase();
                if (venue.includes('vancouver') || venue.includes('bc')) {
                    inferredCity = 'Vancouver';
                    reason = `venue field: "${venue}"`;
                } else if (venue.includes('calgary') || venue.includes('alberta')) {
                    inferredCity = 'Calgary';
                    reason = `venue field: "${venue}"`;
                } else if (venue.includes('toronto') || venue.includes('ontario')) {
                    inferredCity = 'Toronto';
                    reason = `venue field: "${venue}"`;
                } else if (venue.includes('montreal') || venue.includes('quebec')) {
                    inferredCity = 'Montreal';
                    reason = `venue field: "${venue}"`;
                }
            }

            // Strategy 3: Extract from streetAddress
            if (!inferredCity && event.streetAddress && typeof event.streetAddress === 'string') {
                const address = event.streetAddress.toLowerCase();
                if (address.includes('vancouver') || address.includes('bc')) {
                    inferredCity = 'Vancouver';
                    reason = `streetAddress: "${event.streetAddress}"`;
                } else if (address.includes('calgary') || address.includes('alberta')) {
                    inferredCity = 'Calgary';
                    reason = `streetAddress: "${event.streetAddress}"`;
                } else if (address.includes('toronto') || address.includes('ontario')) {
                    inferredCity = 'Toronto';
                    reason = `streetAddress: "${event.streetAddress}"`;
                } else if (address.includes('montreal') || address.includes('quebec')) {
                    inferredCity = 'Montreal';
                    reason = `streetAddress: "${event.streetAddress}"`;
                }
            }

            // Strategy 4: Extract from URL
            if (!inferredCity && event.url && typeof event.url === 'string') {
                const url = event.url.toLowerCase();
                if (url.includes('vancouver')) {
                    inferredCity = 'Vancouver';
                    reason = `URL: "${event.url}"`;
                } else if (url.includes('calgary')) {
                    inferredCity = 'Calgary';
                    reason = `URL: "${event.url}"`;
                } else if (url.includes('toronto')) {
                    inferredCity = 'Toronto';
                    reason = `URL: "${event.url}"`;
                } else if (url.includes('montreal')) {
                    inferredCity = 'Montreal';
                    reason = `URL: "${event.url}"`;
                }
            }

            // Strategy 5: Extract from source name
            if (!inferredCity && event.source && typeof event.source === 'string') {
                const source = event.source.toLowerCase();
                if (source.includes('vancouver')) {
                    inferredCity = 'Vancouver';
                    reason = `source: "${event.source}"`;
                } else if (source.includes('calgary')) {
                    inferredCity = 'Calgary';
                    reason = `source: "${event.source}"`;
                } else if (source.includes('toronto')) {
                    inferredCity = 'Toronto';
                    reason = `source: "${event.source}"`;
                } else if (source.includes('montreal')) {
                    inferredCity = 'Montreal';
                    reason = `source: "${event.source}"`;
                }
            }

            // Strategy 6: Default fallback based on common patterns
            if (!inferredCity) {
                // If all else fails, try to make educated guesses
                if (event.source === 'unknown' || !event.source) {
                    // Check event title for city clues
                    const title = (event.title || '').toLowerCase();
                    if (title.includes('vancouver')) {
                        inferredCity = 'Vancouver';
                        reason = `title contains Vancouver`;
                    } else if (title.includes('calgary')) {
                        inferredCity = 'Calgary';
                        reason = `title contains Calgary`;
                    } else if (title.includes('toronto')) {
                        inferredCity = 'Toronto';
                        reason = `title contains Toronto`;
                    } else if (title.includes('montreal')) {
                        inferredCity = 'Montreal';
                        reason = `title contains Montreal`;
                    }
                }
            }

            // Apply the fix
            if (inferredCity) {
                try {
                    const updateResult = await mongoose.connection.db.collection('events')
                        .updateOne(
                            { _id: event._id },
                            { $set: { city: inferredCity } }
                        );

                    if (updateResult.modifiedCount > 0) {
                        fixedCount++;
                        console.log(`✅ Fixed "${event.title}" → ${inferredCity} (${reason})`);
                    }
                } catch (error) {
                    console.error(`❌ Error fixing event ${event._id}:`, error.message);
                }
            } else {
                unfixableCount++;
                console.log(`❌ Could not infer city for "${event.title}"`);
                console.log(`   Need manual investigation - source: "${event.source}"`);
            }
        }

        console.log(`\n📊 FIX RESULTS:`);
        console.log(`✅ Successfully fixed: ${fixedCount} events`);
        console.log(`❌ Could not fix: ${unfixableCount} events`);

        // Verify final count
        const remainingUndefined = await mongoose.connection.db.collection('events')
            .countDocuments({
                $or: [
                    { city: { $exists: false } },
                    { city: null },
                    { city: "" },
                    { city: "undefined" }
                ]
            });

        console.log(`\n🎯 FINAL RESULT:`);
        console.log(`Events still with undefined city: ${remainingUndefined}`);

        if (remainingUndefined === 0) {
            console.log('🎉 SUCCESS: Every event now has a city!');
        } else {
            console.log('🚨 Manual intervention required for remaining events');
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

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Test mobile app city filtering - should now show all events');
        console.log('2. Update import scripts to always set city from scraper folder');
        console.log('3. Add validation to prevent future undefined city events');
        console.log('4. Test that Vancouver shows all 574+ events now');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 MANDATORY: Every event must have a city - fixing remaining undefined cities');
fixRemainingUndefinedCities();
