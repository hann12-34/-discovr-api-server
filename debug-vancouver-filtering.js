require('dotenv').config();
const mongoose = require('mongoose');

async function debugVancouverFiltering() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 DEBUGGING VANCOUVER CITY FILTERING');
        console.log('🎯 Why only 77 Vancouver events shown out of 1858?\n');

        // Get current date filtering (7 days ago to future)
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        console.log(`📅 Date filtering: ${sevenDaysAgo.toISOString()} to future`);

        // 1. Total events after date filtering (matching app logic)
        const dateFilteredEvents = await mongoose.connection.db.collection('events')
            .find({
                $or: [
                    { "startDate": { $gte: sevenDaysAgo } },
                    { "dateRange.start": { $gte: sevenDaysAgo } }
                ]
            })
            .toArray();

        console.log(`📊 Events after date filtering: ${dateFilteredEvents.length}`);

        // 2. Check city field values for these events
        const cityDistribution = {};
        dateFilteredEvents.forEach(event => {
            const city = event.city || 'undefined';
            cityDistribution[city] = (cityDistribution[city] || 0) + 1;
        });

        console.log('\n🏙️ CITY DISTRIBUTION IN DATE-FILTERED EVENTS:');
        Object.keys(cityDistribution)
            .sort((a, b) => cityDistribution[b] - cityDistribution[a])
            .forEach(city => {
                console.log(`${city}: ${cityDistribution[city]} events`);
            });

        // 3. Check what the mobile app filtering logic would match
        console.log('\n🔍 TESTING MOBILE APP CITY FILTERING LOGIC:');
        
        // Simulate the mobile app's isEventFromCity function
        function simulateAppCityFiltering(event, targetCity) {
            targetCity = targetCity.toLowerCase();
            
            // Priority 1: Check city field
            if (event.city) {
                const eventCity = event.city.toLowerCase().trim();
                if (eventCity === targetCity) {
                    return { match: true, reason: `city field: "${event.city}"` };
                }
            }
            
            // Priority 2: Check location field
            if (event.location && typeof event.location === 'string') {
                const location = event.location.toLowerCase();
                if (location.includes(targetCity)) {
                    return { match: true, reason: `location field: "${event.location}"` };
                }
            }
            
            // Priority 3: Check venue field
            if (event.venue && typeof event.venue === 'string') {
                const venue = event.venue.toLowerCase();
                if (venue.includes(targetCity)) {
                    return { match: true, reason: `venue field: "${event.venue}"` };
                }
            }
            
            // Priority 4: Check venue.name
            if (event.venue && typeof event.venue === 'object' && event.venue.name) {
                const venueName = event.venue.name.toLowerCase();
                if (venueName.includes(targetCity)) {
                    return { match: true, reason: `venue.name: "${event.venue.name}"` };
                }
            }
            
            // Priority 5: Check streetAddress
            if (event.streetAddress && typeof event.streetAddress === 'string') {
                const address = event.streetAddress.toLowerCase();
                if (address.includes(targetCity)) {
                    return { match: true, reason: `streetAddress: "${event.streetAddress}"` };
                }
            }
            
            return { match: false, reason: 'no matching fields' };
        }

        // Test Vancouver filtering
        let vancouverMatches = 0;
        let vancouverMisses = 0;
        const sampleMisses = [];
        
        dateFilteredEvents.forEach(event => {
            const result = simulateAppCityFiltering(event, 'vancouver');
            if (result.match) {
                vancouverMatches++;
            } else {
                vancouverMisses++;
                if (sampleMisses.length < 10) {
                    sampleMisses.push({
                        title: event.title,
                        city: event.city,
                        location: event.location,
                        venue: typeof event.venue === 'string' ? event.venue : event.venue?.name,
                        streetAddress: event.streetAddress,
                        source: event.source
                    });
                }
            }
        });

        console.log(`\n📊 VANCOUVER FILTERING SIMULATION RESULTS:`);
        console.log(`✅ Vancouver matches: ${vancouverMatches}`);
        console.log(`❌ Vancouver misses: ${vancouverMisses}`);
        console.log(`📱 App shows: ~77 events (likely due to additional filtering)`);

        console.log('\n❌ SAMPLE EVENTS MISSING FROM VANCOUVER FILTER:');
        sampleMisses.forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   location: "${event.location}"`);
            console.log(`   venue: "${event.venue}"`);
            console.log(`   streetAddress: "${event.streetAddress}"`);
            console.log(`   source: "${event.source}"`);
        });

        // 4. Check for events that should be Vancouver but aren't tagged correctly
        console.log('\n🔍 CHECKING FOR VANCOUVER EVENTS WITH WRONG/MISSING CITY TAGS:');
        
        const potentialVancouverEvents = dateFilteredEvents.filter(event => {
            // Check if any field suggests this is a Vancouver event
            const fields = [
                event.location,
                event.venue,
                event.venue?.name,
                event.streetAddress,
                event.source
            ].filter(f => f && typeof f === 'string');
            
            return fields.some(field => 
                field.toLowerCase().includes('vancouver') || 
                field.toLowerCase().includes('bc') ||
                field.toLowerCase().includes('british columbia')
            );
        });

        console.log(`📊 Potential Vancouver events (by content): ${potentialVancouverEvents.length}`);
        
        const wronglyTaggedVancouver = potentialVancouverEvents.filter(event => 
            !event.city || event.city.toLowerCase() !== 'vancouver'
        );

        console.log(`🚨 Vancouver events with wrong/missing city tag: ${wronglyTaggedVancouver.length}`);

        if (wronglyTaggedVancouver.length > 0) {
            console.log('\n🚨 SAMPLE VANCOUVER EVENTS WITH WRONG CITY TAGS:');
            wronglyTaggedVancouver.slice(0, 5).forEach((event, index) => {
                console.log(`\n${index + 1}. "${event.title}"`);
                console.log(`   city: "${event.city}" ❌`);
                console.log(`   location: "${event.location}"`);
                console.log(`   venue: "${event.venue || event.venue?.name}"`);
                console.log(`   streetAddress: "${event.streetAddress}"`);
                console.log(`   source: "${event.source}"`);
            });
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

        console.log('\n💡 RECOMMENDATIONS:');
        console.log('1. Fix city assignments for Vancouver events with wrong city tags');
        console.log('2. Update mobile app city filtering to be more inclusive');
        console.log('3. Consider venue address matching in city filtering');
        console.log('4. Audit events with missing city fields');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 INVESTIGATING: Why Vancouver only shows 77/1858 events');
debugVancouverFiltering();
