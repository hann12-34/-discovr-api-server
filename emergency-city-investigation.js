require('dotenv').config();
const mongoose = require('mongoose');

async function emergencyCityInvestigation() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🚨 EMERGENCY CITY DATA INVESTIGATION');
        console.log('🎯 Finding out why most events are showing as Vancouver\n');

        // 1. Get current city distribution
        const cityStats = await mongoose.connection.db.collection('events').aggregate([
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

        console.log('📊 CURRENT CITY DISTRIBUTION IN DATABASE:');
        cityStats.forEach(stat => {
            console.log(`${stat._id || 'null'}: ${stat.count} events`);
        });

        // 2. Check events that SHOULD be Calgary but are labeled as something else
        console.log('\n🔍 LOOKING FOR CALGARY EVENTS MISLABELED:');
        const shouldBeCalgarySources = [
            'Palace Theatre Calgary',
            'Calgary Stampede', 
            'Arts Commons Calgary',
            'Explore Canmore',
            'Ski Louise'
        ];

        for (const source of shouldBeCalgarySources) {
            const sourceEvents = await mongoose.connection.db.collection('events')
                .find({ source: source })
                .limit(3)
                .toArray();
            
            if (sourceEvents.length > 0) {
                console.log(`\nSource: "${source}"`);
                sourceEvents.forEach(event => {
                    console.log(`  "${event.title}" → city: "${event.city}", venue.city: "${event.venue?.city}"`);
                });
            }
        }

        // 3. Check events that SHOULD be Montreal but are labeled as something else
        console.log('\n🔍 LOOKING FOR MONTREAL EVENTS MISLABELED:');
        const shouldBeMontrealSources = [
            'scrape-lepointdevente',
            'scrape-newspeak-montreal'
        ];

        for (const source of shouldBeMontrealSources) {
            const sourceEvents = await mongoose.connection.db.collection('events')
                .find({ source: source })
                .limit(3)
                .toArray();
            
            if (sourceEvents.length > 0) {
                console.log(`\nSource: "${source}"`);
                sourceEvents.forEach(event => {
                    console.log(`  "${event.title}" → city: "${event.city}", venue.city: "${event.venue?.city}"`);
                });
            }
        }

        // 4. Check events that SHOULD be Toronto but are labeled as something else
        console.log('\n🔍 LOOKING FOR TORONTO EVENTS MISLABELED:');
        const shouldBeTorontoSources = [
            'ROM',
            'Guild Park Events',
            'Poetry Jazz Cafe',
            'Revival Event'
        ];

        for (const source of shouldBeTorontoSources) {
            const sourceEvents = await mongoose.connection.db.collection('events')
                .find({ source: { $regex: source, $options: 'i' } })
                .limit(3)
                .toArray();
            
            if (sourceEvents.length > 0) {
                console.log(`\nSource contains "${source}"`);
                sourceEvents.forEach(event => {
                    console.log(`  "${event.title}" → city: "${event.city}", venue.city: "${event.venue?.city}"`);
                });
            }
        }

        // 5. Sample Vancouver events to see if they're actually FROM Vancouver
        console.log('\n🔍 SAMPLING VANCOUVER EVENTS TO CHECK AUTHENTICITY:');
        const vancouverSample = await mongoose.connection.db.collection('events')
            .find({ city: "Vancouver" })
            .limit(10)
            .toArray();

        vancouverSample.forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}", venue.city: "${event.venue?.city}"`);
            console.log(`   source: "${event.source}"`);
            console.log(`   venue.address: "${event.venue?.address}"`);
            
            // Check if this looks like it should be another city
            const suspiciousMarkers = [];
            if (event.venue?.address?.includes('Toronto') || event.venue?.address?.includes('ON ')) {
                suspiciousMarkers.push('Toronto address');
            }
            if (event.venue?.address?.includes('Calgary') || event.venue?.address?.includes('AB ')) {
                suspiciousMarkers.push('Calgary address');
            }
            if (event.venue?.address?.includes('Montreal') || event.venue?.address?.includes('QC ')) {
                suspiciousMarkers.push('Montreal address');
            }
            
            if (suspiciousMarkers.length > 0) {
                console.log(`   🚨 SUSPICIOUS: ${suspiciousMarkers.join(', ')}`);
            }
            console.log('');
        });

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 EMERGENCY INVESTIGATION: City assignment data corruption');
emergencyCityInvestigation();
