require('dotenv').config();
const mongoose = require('mongoose');

async function debugTorontoVenueCorruption() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🚨 INVESTIGATING: Toronto events with Vancouver addresses');
        console.log('🎯 Finding Toronto events that have incorrect venue addresses\n');

        // 1. Find Toronto events that have "Toronto" in title but Vancouver addresses
        console.log('🔍 TORONTO EVENTS WITH VANCOUVER ADDRESSES:');
        const torontoEventsWithVancouverAddresses = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    { 
                        $or: [
                            { title: { $regex: /toronto/i } },
                            { city: "Toronto" },
                            { source: { $regex: /toronto/i } }
                        ]
                    },
                    {
                        $or: [
                            { "venue.address": { $regex: /vancouver/i } },
                            { "venue.location": { $regex: /vancouver/i } }
                        ]
                    }
                ]
            })
            .limit(20)
            .toArray();

        console.log(`📊 Found ${torontoEventsWithVancouverAddresses.length} Toronto events with Vancouver addresses:`);
        
        torontoEventsWithVancouverAddresses.forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   source: "${event.source}"`);
            console.log(`   venue.name: "${event.venue?.name}"`);
            console.log(`   venue.address: "${event.venue?.address}"`);
            console.log(`   venue.location: "${event.venue?.location}"`);
        });

        // 2. Check specific Toronto events from the screenshot
        console.log('\n🔍 CHECKING SPECIFIC EVENTS FROM SCREENSHOT:');
        const screenshotEvents = await mongoose.connection.db.collection('events')
            .find({
                $or: [
                    { title: { $regex: /toronto.*danci/i } },
                    { title: { $regex: /toronto.*bacha/i } },
                    { title: { $regex: /toronto.*anton/i } }
                ]
            })
            .toArray();

        console.log(`📊 Found ${screenshotEvents.length} events matching screenshot titles:`);
        
        screenshotEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   venue.name: "${event.venue?.name}"`);
            console.log(`   venue.address: "${event.venue?.address}"`);
            console.log(`   venue.location: "${event.venue?.location}"`);
            console.log(`   source: "${event.source}"`);
        });

        // 3. Count all Toronto events by city field vs title
        console.log('\n📊 TORONTO EVENT COUNTS:');
        
        const torontoByCity = await mongoose.connection.db.collection('events')
            .countDocuments({ city: "Toronto" });
            
        const torontoByTitle = await mongoose.connection.db.collection('events')
            .countDocuments({ title: { $regex: /toronto/i } });
            
        console.log(`Events with city="Toronto": ${torontoByCity}`);
        console.log(`Events with "Toronto" in title: ${torontoByTitle}`);

        // 4. Find patterns in the corrupted venue data
        console.log('\n🔍 ANALYZING VENUE CORRUPTION PATTERNS:');
        
        // Check if there's a pattern in sources
        const corruptedSources = {};
        torontoEventsWithVancouverAddresses.forEach(event => {
            const source = event.source || 'unknown';
            if (!corruptedSources[source]) {
                corruptedSources[source] = 0;
            }
            corruptedSources[source]++;
        });

        console.log('\nCorrupted events by source:');
        Object.entries(corruptedSources).forEach(([source, count]) => {
            console.log(`  ${source}: ${count} events`);
        });

        // 5. Check if the venue address generation logic is wrong
        console.log('\n🔍 SAMPLE VENUE ADDRESS GENERATION:');
        
        const sampleTorontoEvents = await mongoose.connection.db.collection('events')
            .find({ 
                $and: [
                    { title: { $regex: /toronto/i } },
                    { city: "Toronto" }
                ]
            })
            .limit(5)
            .toArray();

        console.log('Sample Toronto events with proper city assignment:');
        sampleTorontoEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   venue.name: "${event.venue?.name}"`);
            console.log(`   venue.address: "${event.venue?.address}"`);
            console.log(`   venue.location: "${event.venue?.location}"`);
            console.log(`   source: "${event.source}"`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 URGENT: Investigating Toronto events with Vancouver venue addresses');
debugTorontoVenueCorruption();
