require('dotenv').config();
const mongoose = require('mongoose');

async function debugExactAddresses() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 INVESTIGATING EXACT ADDRESSES IN DATABASE');
        console.log('🎯 Goal: Ensure every event shows exact address with postal code\n');

        // 1. Check address field availability across all events
        console.log('📊 ADDRESS FIELD AVAILABILITY:');
        
        const totalEvents = await mongoose.connection.db.collection('events').countDocuments();
        console.log(`Total events: ${totalEvents}`);
        
        const eventsWithVenueAddress = await mongoose.connection.db.collection('events')
            .countDocuments({ "venue.address": { $exists: true, $ne: "", $ne: null } });
            
        const eventsWithVenueName = await mongoose.connection.db.collection('events')
            .countDocuments({ "venue.name": { $exists: true, $ne: "", $ne: null } });
            
        const eventsWithVenueLocation = await mongoose.connection.db.collection('events')
            .countDocuments({ "venue.location": { $exists: true, $ne: "", $ne: null } });

        console.log(`Events with venue.address: ${eventsWithVenueAddress} (${((eventsWithVenueAddress/totalEvents)*100).toFixed(1)}%)`);
        console.log(`Events with venue.name: ${eventsWithVenueName} (${((eventsWithVenueName/totalEvents)*100).toFixed(1)}%)`);
        console.log(`Events with venue.location: ${eventsWithVenueLocation} (${((eventsWithVenueLocation/totalEvents)*100).toFixed(1)}%)`);

        // 2. Sample exact addresses with postal codes by city
        console.log('\n📝 SAMPLE EXACT ADDRESSES WITH POSTAL CODES:');
        
        const cities = ['Vancouver', 'Toronto', 'Calgary', 'Montreal'];
        
        for (const city of cities) {
            console.log(`\n=== ${city.toUpperCase()} ADDRESSES ===`);
            
            const cityEvents = await mongoose.connection.db.collection('events')
                .find({ 
                    city: city,
                    "venue.address": { $exists: true, $ne: "", $ne: null }
                })
                .limit(10)
                .toArray();
            
            if (cityEvents.length > 0) {
                cityEvents.forEach((event, index) => {
                    console.log(`${index + 1}. "${event.title}"`);
                    console.log(`   venue.name: "${event.venue?.name}"`);
                    console.log(`   venue.address: "${event.venue?.address}"`);
                    
                    // Check if address has postal code
                    const hasPostalCode = /[A-Z]\d[A-Z]\s?\d[A-Z]\d/.test(event.venue?.address || '');
                    console.log(`   ✅ Has postal code: ${hasPostalCode}`);
                    console.log('');
                });
            } else {
                console.log(`   ❌ No events with venue.address found for ${city}`);
            }
        }

        // 3. Find events that would fall back to generic addresses
        console.log('\n🚨 EVENTS THAT WOULD FALL BACK TO GENERIC ADDRESSES:');
        
        const eventsWithoutGoodAddress = await mongoose.connection.db.collection('events')
            .find({
                $or: [
                    { "venue.address": { $exists: false } },
                    { "venue.address": "" },
                    { "venue.address": null },
                    { "venue.address": "undefined" }
                ]
            })
            .limit(20)
            .toArray();
        
        console.log(`📊 Found ${eventsWithoutGoodAddress.length} events without good addresses:`);
        
        eventsWithoutGoodAddress.slice(0, 10).forEach((event, index) => {
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   city: "${event.city}"`);
            console.log(`   venue.name: "${event.venue?.name}"`);
            console.log(`   venue.address: "${event.venue?.address}"`);
            console.log(`   venue.location: "${event.venue?.location}"`);
            console.log(`   source: "${event.source}"`);
        });

        // 4. Check for patterns in missing addresses
        console.log('\n📊 SOURCES WITH MISSING ADDRESSES:');
        
        const sourceAddressStats = await mongoose.connection.db.collection('events').aggregate([
            {
                $match: {
                    $or: [
                        { "venue.address": { $exists: false } },
                        { "venue.address": "" },
                        { "venue.address": null }
                    ]
                }
            },
            {
                $group: {
                    _id: "$source",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            }
        ]).toArray();

        sourceAddressStats.forEach(stat => {
            console.log(`${stat._id || 'unknown'}: ${stat.count} events without address`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        console.log('\n💡 RECOMMENDATION: Fix mobile app to always use venue.address when available');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 INVESTIGATING: Why events show "Downtown Vancouver" instead of exact addresses');
debugExactAddresses();
