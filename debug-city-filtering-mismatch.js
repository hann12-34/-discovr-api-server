require('dotenv').config();
const mongoose = require('mongoose');

async function debugCityFilteringMismatch() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 DEBUGGING: Why only 77/1839 Vancouver events show after city filtering');
        console.log('🎯 Mobile app shows: 77 Vancouver events out of 1839 total after date filtering\n');

        // Get current date for date filtering (same as mobile app)
        const now = new Date();
        const dateFilter = { date: { $gte: now } }; // Events from today onwards

        // Count total events after date filtering
        const totalEventsAfterDate = await mongoose.connection.db.collection('events')
            .countDocuments(dateFilter);

        console.log(`📊 Total events after date filtering: ${totalEventsAfterDate}`);

        // Count events with city = 'Vancouver'
        const vancouverByCity = await mongoose.connection.db.collection('events')
            .countDocuments({
                ...dateFilter,
                city: 'Vancouver'
            });

        console.log(`📊 Vancouver events by city field: ${vancouverByCity}`);

        // Simulate mobile app city filtering logic for Vancouver
        const allEventsAfterDate = await mongoose.connection.db.collection('events')
            .find(dateFilter)
            .toArray();

        console.log(`📊 Retrieved ${allEventsAfterDate.length} events for filtering simulation`);

        // Simulate the mobile app filtering logic
        let matchedByMobileLogic = 0;
        let sampleMatched = [];
        let sampleNotMatched = [];

        allEventsAfterDate.forEach((event, index) => {
            const isVancouverEvent = simulateMobileAppCityFilter(event, 'Vancouver');
            
            if (isVancouverEvent) {
                matchedByMobileLogic++;
                if (sampleMatched.length < 5) {
                    sampleMatched.push({
                        title: event.title,
                        city: event.city,
                        location: event.location,
                        venue: event.venue?.name || event.venue,
                        streetAddress: event.streetAddress,
                        source: event.source
                    });
                }
            } else {
                // Only collect non-matched events that should be Vancouver
                if (event.city === 'Vancouver' && sampleNotMatched.length < 10) {
                    sampleNotMatched.push({
                        title: event.title,
                        city: event.city,
                        location: event.location,
                        venue: event.venue?.name || event.venue,
                        streetAddress: event.streetAddress,
                        source: event.source
                    });
                }
            }
        });

        console.log(`\n📊 FILTERING SIMULATION RESULTS:`);
        console.log(`Mobile app logic matched: ${matchedByMobileLogic} Vancouver events`);
        console.log(`Expected from mobile app: 77 events`);
        console.log(`Database has: ${vancouverByCity} events with city='Vancouver'`);

        console.log(`\n✅ SAMPLE EVENTS THAT MATCH MOBILE FILTERING:`);
        sampleMatched.forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   location: "${event.location}"`);
            console.log(`   venue: "${event.venue}"`);
            console.log(`   streetAddress: "${event.streetAddress}"`);
            console.log(`   source: "${event.source}"`);
        });

        console.log(`\n❌ SAMPLE EVENTS THAT DON'T MATCH MOBILE FILTERING (but should!):`);
        sampleNotMatched.forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}" ← HAS VANCOUVER IN DB!`);
            console.log(`   location: "${event.location}"`);
            console.log(`   venue: "${event.venue}"`);
            console.log(`   streetAddress: "${event.streetAddress}"`);
            console.log(`   source: "${event.source}"`);
            console.log(`   ⚠️ WHY NOT MATCHING? Mobile app ignores 'city' field!`);
        });

        console.log(`\n🚨 ROOT CAUSE:`);
        console.log(`The mobile app city filtering function does NOT check the standardized 'city' field!`);
        console.log(`It only checks location, venue, and streetAddress fields for city names.`);
        console.log(`But we fixed the database to have proper 'city' fields - the app needs to use them!`);

        console.log(`\n🔧 SOLUTION:`);
        console.log(`Update mobile app isEventFromCity function to FIRST check event.city field`);
        console.log(`Then fall back to location/venue/address parsing only if needed`);

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Simulate the exact mobile app city filtering logic from ContentView.swift
function simulateMobileAppCityFilter(event, filterCity) {
    // This replicates the mobile app logic exactly
    const cityFromLocation = (event.location || '').split(',')[0]?.trim() || '';
    const venueCity = (typeof event.venue === 'string' ? event.venue : event.venue?.name || '').split(',')[0]?.trim() || '';
    const venueAddress = event.streetAddress || '';
    
    const normalizedCityFromLocation = cityFromLocation.toLowerCase();
    const normalizedVenueCity = venueCity.toLowerCase();
    const normalizedVenueAddress = venueAddress.toLowerCase();
    const normalizedFilterCity = filterCity.toLowerCase();
    
    // Check for exact city match in location, venue, or address
    if (normalizedCityFromLocation === normalizedFilterCity ||
        normalizedVenueCity === normalizedFilterCity) {
        return true;
    }
    
    // Check venue address contains city
    if (normalizedVenueAddress.includes(normalizedFilterCity)) {
        return true;
    }
    
    // Check if full location or venue contains city
    if ((event.location || '').toLowerCase().includes(normalizedFilterCity) ||
        (typeof event.venue === 'string' ? event.venue : event.venue?.name || '').toLowerCase().includes(normalizedFilterCity)) {
        return true;
    }
    
    // NOTE: The mobile app does NOT check event.city field - this is the bug!
    
    return false;
}

console.log('🔍 Debugging Vancouver city filtering mismatch...');
debugCityFilteringMismatch();
