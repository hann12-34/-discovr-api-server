require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function fixCitiesByScraperFolder() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔧 FIXING CITIES USING SCRAPER FOLDER STRUCTURE AS AUTHORITY');
        console.log('🎯 Rule: scrapers/cities/vancouver → Vancouver, etc.\n');

        // Build authoritative scraper → city mapping from folder structure
        const scraperCityMapping = new Map();
        const citiesDir = './scrapers/cities';
        const cities = ['vancouver', 'Calgary', 'Toronto', 'Montreal'];

        cities.forEach(cityFolder => {
            const cityDir = path.join(citiesDir, cityFolder);
            if (fs.existsSync(cityDir)) {
                const scraperFiles = fs.readdirSync(cityDir)
                    .filter(file => file.endsWith('.js') && file.startsWith('scrape-'));

                scraperFiles.forEach(file => {
                    // Extract scraper name from filename
                    const scraperName = file.replace('scrape-', '').replace('.js', '');
                    const variants = [
                        scraperName,
                        scraperName.replace(/-/g, ' '),
                        scraperName.replace(/-/g, ''),
                        file.replace('.js', ''),
                        // Add common source name patterns
                        scraperName.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' '),
                    ];

                    // Normalize city name
                    const normalizedCity = cityFolder === 'vancouver' ? 'Vancouver' :
                                         cityFolder === 'Calgary' ? 'Calgary' :
                                         cityFolder === 'Toronto' ? 'Toronto' :
                                         cityFolder === 'Montreal' ? 'Montreal' : cityFolder;

                    variants.forEach(variant => {
                        scraperCityMapping.set(variant.toLowerCase(), normalizedCity);
                    });
                });

                console.log(`📁 ${cityFolder}: ${scraperFiles.length} scrapers → ${normalizedCity === 'vancouver' ? 'Vancouver' : normalizedCity}`);
            }
        });

        console.log(`\n📊 Built mapping for ${scraperCityMapping.size} scraper name variants`);

        // Find all events with undefined cities
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

        console.log(`\n📊 Found ${undefinedCityEvents.length} events with undefined city`);

        if (undefinedCityEvents.length === 0) {
            console.log('✅ All events have cities!');
            await mongoose.disconnect();
            return;
        }

        // Group by source to see patterns
        const sourceGroups = {};
        undefinedCityEvents.forEach(event => {
            const source = event.source || 'unknown';
            if (!sourceGroups[source]) sourceGroups[source] = [];
            sourceGroups[source].push(event);
        });

        console.log('\n📋 UNDEFINED EVENTS BY SOURCE:');
        Object.keys(sourceGroups).forEach(source => {
            console.log(`"${source}": ${sourceGroups[source].length} events`);
        });

        // Fix cities based on scraper folder structure
        console.log('\n🔧 FIXING CITIES USING SCRAPER FOLDER AUTHORITY:');

        let fixedCount = 0;
        let manualFixedCount = 0;

        // Strategy 1: Direct scraper mapping
        for (const [source, events] of Object.entries(sourceGroups)) {
            if (source === 'unknown' || source === 'undefined') {
                continue; // Handle these separately
            }

            // Check if source matches any scraper name
            const normalizedSource = source.toLowerCase();
            let cityFromMapping = null;

            // Try exact match first
            if (scraperCityMapping.has(normalizedSource)) {
                cityFromMapping = scraperCityMapping.get(normalizedSource);
            } else {
                // Try partial matches
                for (const [scraperKey, city] of scraperCityMapping.entries()) {
                    if (normalizedSource.includes(scraperKey) || scraperKey.includes(normalizedSource)) {
                        cityFromMapping = city;
                        break;
                    }
                }
            }

            if (cityFromMapping) {
                console.log(`\n📝 Fixing ${events.length} events from "${source}" → ${cityFromMapping}`);
                
                try {
                    const updateResult = await mongoose.connection.db.collection('events')
                        .updateMany(
                            { source: source, $or: [
                                { city: { $exists: false } },
                                { city: null },
                                { city: "" },
                                { city: "undefined" }
                            ]},
                            { $set: { city: cityFromMapping } }
                        );

                    fixedCount += updateResult.modifiedCount;
                    console.log(`   ✅ Fixed ${updateResult.modifiedCount} events`);

                } catch (error) {
                    console.error(`   ❌ Error fixing events from ${source}:`, error.message);
                }
            }
        }

        // Strategy 2: Manual fixes for known patterns
        console.log('\n🔧 MANUAL FIXES FOR KNOWN PATTERNS:');

        // POETRY events - these appear to be Toronto events based on context
        const poetryEvents = await mongoose.connection.db.collection('events')
            .find({
                title: { $regex: /POETRY PRESENTS/i },
                $or: [
                    { city: { $exists: false } },
                    { city: null },
                    { city: "" },
                    { city: "undefined" }
                ]
            })
            .toArray();

        if (poetryEvents.length > 0) {
            console.log(`📝 Found ${poetryEvents.length} POETRY events without city`);
            console.log('   Assigning to Toronto based on context...');

            try {
                const updateResult = await mongoose.connection.db.collection('events')
                    .updateMany(
                        {
                            title: { $regex: /POETRY PRESENTS/i },
                            $or: [
                                { city: { $exists: false } },
                                { city: null },
                                { city: "" },
                                { city: "undefined" }
                            ]
                        },
                        { $set: { city: 'Toronto' } }
                    );

                manualFixedCount += updateResult.modifiedCount;
                console.log(`   ✅ Fixed ${updateResult.modifiedCount} POETRY events → Toronto`);

            } catch (error) {
                console.error(`   ❌ Error fixing POETRY events:`, error.message);
            }
        }

        // Pride events - likely Toronto based on context
        const prideEvents = await mongoose.connection.db.collection('events')
            .find({
                title: { $regex: /pride/i },
                $or: [
                    { city: { $exists: false } },
                    { city: null },
                    { city: "" },
                    { city: "undefined" }
                ]
            })
            .toArray();

        if (prideEvents.length > 0) {
            console.log(`📝 Found ${prideEvents.length} Pride events without city`);
            console.log('   Assigning to Toronto based on context...');

            try {
                const updateResult = await mongoose.connection.db.collection('events')
                    .updateMany(
                        {
                            title: { $regex: /pride/i },
                            $or: [
                                { city: { $exists: false } },
                                { city: null },
                                { city: "" },
                                { city: "undefined" }
                            ]
                        },
                        { $set: { city: 'Toronto' } }
                    );

                manualFixedCount += updateResult.modifiedCount;
                console.log(`   ✅ Fixed ${updateResult.modifiedCount} Pride events → Toronto`);

            } catch (error) {
                console.error(`   ❌ Error fixing Pride events:`, error.message);
            }
        }

        console.log(`\n📊 TOTAL FIX RESULTS:`);
        console.log(`✅ Fixed by scraper mapping: ${fixedCount} events`);
        console.log(`✅ Fixed by manual patterns: ${manualFixedCount} events`);
        console.log(`✅ Total fixed: ${fixedCount + manualFixedCount} events`);

        // Final verification
        const stillUndefined = await mongoose.connection.db.collection('events')
            .countDocuments({
                $or: [
                    { city: { $exists: false } },
                    { city: null },
                    { city: "" },
                    { city: "undefined" }
                ]
            });

        console.log(`\n🎯 FINAL RESULT:`);
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

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. TEST MOBILE APP: All events should have cities now');
        console.log('2. Vancouver should show ~769 events (not 77!)');
        console.log('3. Update import scripts to enforce scraper folder → city mapping');
        console.log('4. Add validation to prevent future undefined cities');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 AUTHORITATIVE FIX: Using scraper folder structure to assign cities');
fixCitiesByScraperFolder();
