require('dotenv').config();
const mongoose = require('mongoose');

async function auditMissingAddresses() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 AUDITING EVENTS WITH MISSING EXACT ADDRESSES');
        console.log('🎯 Goal: Find ALL events without streetAddress and fix them\n');

        // Find events without proper streetAddress
        const eventsWithoutAddress = await mongoose.connection.db.collection('events')
            .find({
                $or: [
                    { "venue.address": { $exists: false } },
                    { "venue.address": "" },
                    { "venue.address": null },
                    { "venue.address": "undefined" },
                    { "streetAddress": { $exists: false } },
                    { "streetAddress": "" },
                    { "streetAddress": null },
                    { "streetAddress": "undefined" }
                ]
            })
            .toArray();

        console.log(`📊 EVENTS WITHOUT EXACT ADDRESSES: ${eventsWithoutAddress.length}`);

        // Group by source to identify which scrapers need fixing
        const eventsBySource = {};
        const eventsByCity = {};
        
        eventsWithoutAddress.forEach(event => {
            const source = event.source || 'unknown';
            const city = event.city || 'unknown';
            
            if (!eventsBySource[source]) eventsBySource[source] = [];
            if (!eventsByCity[city]) eventsByCity[city] = [];
            
            eventsBySource[source].push(event);
            eventsByCity[city].push(event);
        });

        console.log('\n📋 MISSING ADDRESSES BY SOURCE:');
        Object.keys(eventsBySource).sort((a, b) => eventsBySource[b].length - eventsBySource[a].length).forEach(source => {
            console.log(`${source}: ${eventsBySource[source].length} events missing addresses`);
        });

        console.log('\n🏙️ MISSING ADDRESSES BY CITY:');
        Object.keys(eventsByCity).sort((a, b) => eventsByCity[b].length - eventsByCity[a].length).forEach(city => {
            console.log(`${city}: ${eventsByCity[city].length} events missing addresses`);
        });

        console.log('\n🔍 SAMPLE EVENTS NEEDING ADDRESS FIXES:');
        
        // Show worst offenders by source
        const topSources = Object.keys(eventsBySource)
            .sort((a, b) => eventsBySource[b].length - eventsBySource[a].length)
            .slice(0, 5);

        for (const source of topSources) {
            console.log(`\n=== ${source.toUpperCase()} (${eventsBySource[source].length} events) ===`);
            
            const sampleEvents = eventsBySource[source].slice(0, 3);
            sampleEvents.forEach((event, index) => {
                console.log(`\n${index + 1}. "${event.title}"`);
                console.log(`   city: "${event.city}"`);
                console.log(`   venue.name: "${event.venue?.name}"`);
                console.log(`   venue.address: "${event.venue?.address}"`);
                console.log(`   streetAddress: "${event.streetAddress}"`);
                console.log(`   location: "${event.location}"`);
                console.log(`   venue: "${event.venue}"`);
                console.log(`   url: "${event.url}"`);
            });
        }

        // Find events that DO have good addresses as examples
        console.log('\n✅ SAMPLE EVENTS WITH GOOD ADDRESSES (FOR REFERENCE):');
        
        const eventsWithGoodAddress = await mongoose.connection.db.collection('events')
            .find({
                "venue.address": { $exists: true, $ne: "", $ne: null, $ne: "undefined" },
                $and: [
                    { "venue.address": { $regex: /[A-Z]\d[A-Z]\s?\d[A-Z]\d/ } } // Has postal code
                ]
            })
            .limit(10)
            .toArray();

        eventsWithGoodAddress.slice(0, 5).forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}" (${event.city})`);
            console.log(`   venue.address: "${event.venue?.address}" ✅`);
            console.log(`   source: "${event.source}"`);
        });

        console.log('\n🛠️ RECOMMENDED FIXES:');
        console.log('1. Fix scrapers to extract exact venue addresses');
        console.log('2. Update import scripts to populate streetAddress field');
        console.log('3. For events with venue names but no address, add address lookup');
        console.log('4. Verify all scrapers capture venue.address with postal codes');

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 NO FALLBACKS ALLOWED: Finding ALL events without exact addresses');
auditMissingAddresses();
