require('dotenv').config();
const mongoose = require('mongoose');

async function debugExactFilteringSimulation() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 DEBUGGING: Why is Vancouver STILL only 77 events?');
        console.log('📊 App shows: Vancouver 77/1839, Toronto 290/1839\n');

        // Use broader date filtering to match mobile app (includes past and future events)
        // Mobile app likely filters by event availability, not strict future dates
        const dateFilter = {}; // Get ALL events to match mobile app's 1839 count

        // Get all events after date filtering
        const allEventsAfterDate = await mongoose.connection.db.collection('events')
            .find(dateFilter)
            .toArray();

        console.log(`📊 Total events after date filtering: ${allEventsAfterDate.length}`);

        // Simulate EXACT mobile app filtering for Vancouver
        let vancouverMatchCount = 0;
        let torontoMatchCount = 0;
        let vancouverSamples = [];
        let vancouverNonMatches = [];

        allEventsAfterDate.forEach((event) => {
            const isVancouverEvent = simulateExactMobileAppLogic(event, 'vancouver');
            const isTorontoEvent = simulateExactMobileAppLogic(event, 'toronto');

            if (isVancouverEvent) {
                vancouverMatchCount++;
                if (vancouverSamples.length < 5) {
                    vancouverSamples.push({
                        title: event.title,
                        location: event.location,
                        venue: event.venue?.name || event.venue,
                        streetAddress: event.streetAddress,
                        city: event.city
                    });
                }
            } else {
                // Collect events that SHOULD be Vancouver but aren't matching
                if (event.city === 'Vancouver' && vancouverNonMatches.length < 10) {
                    vancouverNonMatches.push({
                        title: event.title,
                        location: event.location,
                        venue: event.venue?.name || event.venue,
                        streetAddress: event.streetAddress,
                        city: event.city
                    });
                }
            }

            if (isTorontoEvent) {
                torontoMatchCount++;
            }
        });

        console.log(`\n📊 SIMULATION RESULTS:`);
        console.log(`Vancouver events matched by simulation: ${vancouverMatchCount}`);
        console.log(`Toronto events matched by simulation: ${torontoMatchCount}`);
        console.log(`Expected from app: Vancouver 77, Toronto 290`);

        console.log(`\n✅ SAMPLE VANCOUVER EVENTS THAT MATCHED:`);
        vancouverSamples.forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   location: "${event.location}"`);
            console.log(`   venue: "${event.venue}"`);
            console.log(`   streetAddress: "${event.streetAddress}"`);
        });

        console.log(`\n❌ SAMPLE VANCOUVER DB EVENTS THAT DIDN'T MATCH FILTERING:`);
        vancouverNonMatches.forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}" ← HAS VANCOUVER IN DB!`);
            console.log(`   location: "${event.location}"`);
            console.log(`   venue: "${event.venue}"`);
            console.log(`   streetAddress: "${event.streetAddress}"`);
            console.log(`   🚨 WHY NOT MATCHING?`);
        });

        // Check database counts directly
        const dbVancouverCount = await mongoose.connection.db.collection('events')
            .countDocuments({
                ...dateFilter,
                city: 'Vancouver'
            });

        console.log(`\n📊 DATABASE DIRECT COUNTS:`);
        console.log(`Events with city='Vancouver': ${dbVancouverCount}`);
        console.log(`Events with city='Toronto': ${await mongoose.connection.db.collection('events').countDocuments({...dateFilter, city: 'Toronto'})}`);

        console.log(`\n🚨 ROOT CAUSE ANALYSIS:`);
        if (vancouverMatchCount === 77) {
            console.log(`✅ Simulation matches app exactly (77) - the filtering logic IS being applied`);
            console.log(`🔍 Problem: The filtering logic itself is still too restrictive!`);
            console.log(`💡 Need to debug WHY ${dbVancouverCount} DB Vancouver events only result in 77 matches`);
        } else {
            console.log(`❌ Simulation doesn't match app - there's a disconnect between code and app`);
            console.log(`🔍 App might be using different filtering logic or caching old code`);
        }

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Simulate the EXACT mobile app filtering logic from ContentView.swift
function simulateExactMobileAppLogic(event, filterCity) {
    const normalizedFilterCity = filterCity.toLowerCase();
    
    // Extract city info from all available fields
    const cityFromLocation = (event.location || '').split(',')[0]?.trim() || '';
    const venueCity = (typeof event.venue === 'string' ? event.venue : event.venue?.name || '').split(',')[0]?.trim() || '';
    const venueAddress = event.streetAddress || '';
    
    // Normalize strings for comparison
    const normalizedCityFromLocation = cityFromLocation.toLowerCase();
    const normalizedVenueCity = venueCity.toLowerCase();
    const normalizedVenueAddress = venueAddress.toLowerCase();
    const normalizedFullLocation = (event.location || '').toLowerCase();
    const normalizedFullVenue = (typeof event.venue === 'string' ? event.venue : event.venue?.name || '').toLowerCase();
    
    // PRIORITY: For Vancouver, be VERY inclusive (this is the logic I added)
    if (normalizedFilterCity === 'vancouver') {
        // Vancouver events can be:
        if (normalizedCityFromLocation.includes('vancouver') ||
            normalizedVenueCity.includes('vancouver') ||
            normalizedVenueAddress.includes('vancouver') ||
            normalizedFullLocation.includes('vancouver') ||
            normalizedFullVenue.includes('vancouver') ||
            normalizedVenueAddress.includes('richmond') ||
            normalizedVenueAddress.includes('burnaby') ||
            normalizedVenueAddress.includes('north vancouver') ||
            normalizedVenueAddress.includes('west vancouver')) {
            return true;
        }
        
        // If event has BC/British Columbia but no other specific city, assume Vancouver
        if ((normalizedVenueAddress.includes('bc') || normalizedVenueAddress.includes('british columbia')) &&
            !normalizedVenueAddress.includes('calgary') &&
            !normalizedVenueAddress.includes('toronto') &&
            !normalizedVenueAddress.includes('montreal')) {
            return true;
        }
        
        // If no specific location info, default to Vancouver (many events lack detailed addresses)
        if (cityFromLocation === '' && venueCity === '' && venueAddress === '') {
            return true;
        }
    }
    
    // Standard exact matching for other cities
    if (normalizedCityFromLocation === normalizedFilterCity ||
        normalizedVenueCity === normalizedFilterCity) {
        return true;
    }
    
    // Continue with the rest of the original filtering logic...
    if (normalizedVenueAddress.includes(normalizedFilterCity)) {
        return true;
    }
    
    if (normalizedFullLocation.includes(normalizedFilterCity) ||
        normalizedFullVenue.includes(normalizedFilterCity)) {
        return true;
    }
    
    return false;
}

console.log('🔍 Simulating exact mobile app city filtering to debug Vancouver issue...');
debugExactFilteringSimulation();
