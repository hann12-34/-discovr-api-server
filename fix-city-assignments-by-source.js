require('dotenv').config();
const mongoose = require('mongoose');

async function fixCityAssignmentsBySource() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔧 FIXING CITY ASSIGNMENTS BASED ON SCRAPER SOURCE');
        console.log('🎯 Goal: Ensure every event has correct city based on scraper folder\n');

        // Define city mappings based on scraper source patterns
        const cityMappings = [
            // Vancouver sources
            {
                city: 'Vancouver',
                patterns: [
                    /vancouver/i,
                    /scrape-todocanada-vancouver/i,
                    /scrape-vancouver/i,
                    /scrape-the-phoenix/i,
                    /scrape-commodore-ballroom/i,
                    /scrape-bc-place/i,
                    /scrape-rogers-arena/i,
                    /scrape-the-pearl/i,
                    /scrape-the-living-room/i,
                    /scrape-fox-cabaret/i,
                    /scrape-stanley-park/i,
                    /scrape-pne/i,
                    /scrape-vancouver-art-gallery/i,
                    /scrape-convention-centre/i
                ]
            },
            // Calgary sources
            {
                city: 'Calgary',
                patterns: [
                    /calgary/i,
                    /scrape-calgary/i,
                    /scrape-arts-commons/i,
                    /scrape-bella-concert/i,
                    /scrape-bow-valley/i,
                    /scrape-stampede/i,
                    /scrape-saddledome/i,
                    /scrape-telus-spark/i,
                    /scrape-heritage-park/i,
                    /scrape-prince-island/i,
                    /canmore/i,
                    /lake louise/i
                ]
            },
            // Toronto sources
            {
                city: 'Toronto',
                patterns: [
                    /toronto/i,
                    /scrape-toronto/i,
                    /scrape-todocanada-toronto/i,
                    /scrape-nowplaying-toronto/i,
                    /scrape-roy-thomson/i,
                    /scrape-four-seasons/i,
                    /scrape-danforth-music/i,
                    /scrape-phoenix-concert/i,
                    /scrape-opera-house/i,
                    /scrape-horseshoe/i,
                    /scrape-the-rex/i,
                    /scrape-casa-loma/i,
                    /scrape-harbourfront/i,
                    /friends of guild/i,
                    /royal ontario museum/i,
                    /rom/i
                ]
            },
            // Montreal sources
            {
                city: 'Montreal',
                patterns: [
                    /montreal/i,
                    /scrape-montreal/i,
                    /scrape-place-des-arts/i,
                    /scrape-new-city-gas/i,
                    /scrape-newspeak/i,
                    /scrape-club-unity/i,
                    /scrape-just-for-laughs/i,
                    /scrape-osheaga/i,
                    /scrape-piknic/i,
                    /scrape-mural-festival/i,
                    /scrape-nuits-afrique/i,
                    /scrape-studio-td/i,
                    /scrape-science-centre/i,
                    /mtl/i
                ]
            }
        ];

        // First, audit current city assignments by source
        console.log('📊 AUDITING CURRENT CITY ASSIGNMENTS BY SOURCE:');
        
        const sourceStats = await mongoose.connection.db.collection('events').aggregate([
            {
                $group: {
                    _id: {
                        source: "$source",
                        city: "$city"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        // Group by source to see city distribution
        const sourceGroups = {};
        sourceStats.forEach(stat => {
            const source = stat._id.source || 'unknown';
            const city = stat._id.city || 'undefined';
            if (!sourceGroups[source]) sourceGroups[source] = {};
            sourceGroups[source][city] = stat.count;
        });

        console.log('\n🔍 TOP SOURCES WITH CITY MISMATCHES:');
        Object.keys(sourceGroups)
            .sort((a, b) => Object.values(sourceGroups[b]).reduce((sum, count) => sum + count, 0) - 
                             Object.values(sourceGroups[a]).reduce((sum, count) => sum + count, 0))
            .slice(0, 15)
            .forEach(source => {
                const cities = sourceGroups[source];
                const totalEvents = Object.values(cities).reduce((sum, count) => sum + count, 0);
                const cityNames = Object.keys(cities);
                
                if (cityNames.length > 1 || cityNames.includes('undefined')) {
                    console.log(`\n📄 "${source}" (${totalEvents} events):`);
                    cityNames.forEach(city => {
                        console.log(`   ${city}: ${cities[city]} events`);
                    });
                }
            });

        // Now fix city assignments based on source patterns
        console.log('\n🔧 FIXING CITY ASSIGNMENTS BASED ON SOURCE:');
        
        let fixedCount = 0;
        let errorCount = 0;

        for (const mapping of cityMappings) {
            const { city, patterns } = mapping;
            
            console.log(`\n=== FIXING ${city.toUpperCase()} EVENTS ===`);
            
            for (const pattern of patterns) {
                // Find events from this source pattern that don't have the correct city
                const eventsToFix = await mongoose.connection.db.collection('events')
                    .find({
                        source: { $regex: pattern },
                        $or: [
                            { city: { $ne: city } },
                            { city: { $exists: false } },
                            { city: null },
                            { city: "" },
                            { city: "undefined" }
                        ]
                    })
                    .toArray();

                if (eventsToFix.length > 0) {
                    console.log(`📝 Fixing ${eventsToFix.length} events from pattern: ${pattern}`);
                    
                    // Sample of events being fixed
                    eventsToFix.slice(0, 3).forEach(event => {
                        console.log(`   "${event.title}" - changing from "${event.city}" to "${city}"`);
                    });

                    try {
                        const updateResult = await mongoose.connection.db.collection('events')
                            .updateMany(
                                {
                                    source: { $regex: pattern },
                                    $or: [
                                        { city: { $ne: city } },
                                        { city: { $exists: false } },
                                        { city: null },
                                        { city: "" },
                                        { city: "undefined" }
                                    ]
                                },
                                { 
                                    $set: { city: city } 
                                }
                            );

                        fixedCount += updateResult.modifiedCount;
                        console.log(`   ✅ Fixed ${updateResult.modifiedCount} events`);

                    } catch (error) {
                        console.error(`   ❌ Error fixing events for pattern ${pattern}:`, error.message);
                        errorCount++;
                    }
                }
            }
        }

        console.log(`\n📊 CITY ASSIGNMENT FIX RESULTS:`);
        console.log(`✅ Successfully fixed: ${fixedCount} events`);
        console.log(`❌ Errors: ${errorCount}`);

        // Verify the fixes worked
        console.log('\n🔍 VERIFYING FIXES...');
        
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

        // Count remaining events with wrong/missing cities
        const stillMissingCity = await mongoose.connection.db.collection('events')
            .countDocuments({
                $or: [
                    { city: { $exists: false } },
                    { city: null },
                    { city: "" },
                    { city: "undefined" }
                ]
            });

        console.log(`\n🚨 Events still missing city: ${stillMissingCity}`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Test mobile app city filtering with corrected assignments');
        console.log('2. Verify all 574 Vancouver events now show correctly');
        console.log('3. Update scrapers to always set correct city at import time');
        console.log('4. Add validation to prevent future city assignment errors');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 ENFORCING CITY ASSIGNMENTS BASED ON SCRAPER FOLDER STRUCTURE');
fixCityAssignmentsBySource();
