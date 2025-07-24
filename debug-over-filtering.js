require('dotenv').config();
const mongoose = require('mongoose');

async function debugOverFiltering() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 INVESTIGATING OVER-FILTERING ISSUES');
        console.log('🎯 Expected: ~497 Montreal events, but app shows only 42\n');

        // 1. Check total events and date distribution
        const totalEvents = await mongoose.connection.db.collection('events').countDocuments();
        console.log(`📊 Total events in database: ${totalEvents}`);

        // Check date distribution
        const now = new Date();
        const pastEvents = await mongoose.connection.db.collection('events')
            .countDocuments({ 
                $or: [
                    { date: { $lt: now } },
                    { startDate: { $lt: now } },
                    { "dateRange.start": { $lt: now } }
                ]
            });
        
        const futureEvents = totalEvents - pastEvents;
        console.log(`📅 Past events: ${pastEvents}`);
        console.log(`📅 Future events: ${futureEvents}`);
        console.log(`📅 App shows 1858 after date filtering (${totalEvents - 1858} filtered out)`);

        // 2. Detailed Montreal event analysis
        console.log('\n🔍 MONTREAL EVENT ANALYSIS:');
        
        const montrealEvents = await mongoose.connection.db.collection('events')
            .find({ city: "Montreal" })
            .limit(20)
            .toArray();

        console.log(`📊 Montreal events with city="Montreal": ${montrealEvents.length}`);
        
        if (montrealEvents.length > 0) {
            console.log('\n📝 Sample Montreal events (first 10):');
            montrealEvents.slice(0, 10).forEach((event, index) => {
                console.log(`${index + 1}. "${event.title}"`);
                console.log(`   city: "${event.city}"`);
                console.log(`   venue.city: "${event.venue?.city}"`);
                console.log(`   location: "${event.venue?.location || 'N/A'}"`);
                console.log(`   venue.address: "${event.venue?.address}"`);
                console.log(`   date: ${event.date || event.startDate || 'N/A'}`);
                console.log('');
            });
        }

        // 3. Check for Montreal events that might be missed by filtering
        console.log('\n🔍 POTENTIAL MONTREAL EVENTS MISSED BY FILTERING:');
        
        // Look for events that contain "montreal" in various fields but might not have city="Montreal"
        const potentialMontrealEvents = await mongoose.connection.db.collection('events')
            .find({
                $and: [
                    { city: { $ne: "Montreal" } }, // Not already labeled as Montreal
                    {
                        $or: [
                            { "venue.city": { $regex: /montreal/i } },
                            { "venue.address": { $regex: /montreal/i } },
                            { "venue.location": { $regex: /montreal/i } },
                            { source: { $regex: /montreal/i } },
                            { title: { $regex: /montreal/i } }
                        ]
                    }
                ]
            })
            .limit(10)
            .toArray();

        console.log(`📊 Potential missed Montreal events: ${potentialMontrealEvents.length}`);
        
        if (potentialMontrealEvents.length > 0) {
            console.log('\n📝 Sample potentially missed Montreal events:');
            potentialMontrealEvents.forEach((event, index) => {
                console.log(`${index + 1}. "${event.title}"`);
                console.log(`   city: "${event.city}"`);
                console.log(`   venue.city: "${event.venue?.city}"`);
                console.log(`   venue.address: "${event.venue?.address}"`);
                console.log(`   source: "${event.source}"`);
                console.log('');
            });
        }

        // 4. Check what the mobile app filtering logic would see
        console.log('\n🔍 TESTING MOBILE APP FILTERING LOGIC:');
        
        const testEvents = montrealEvents.slice(0, 5);
        console.log('Testing first 5 Montreal events against mobile filtering logic:');
        
        testEvents.forEach((event, index) => {
            const location = event.venue?.location || '';
            const venue = event.venue?.name || '';
            
            // Extract city from location or venue (like mobile app does)
            const cityFromLocation = location.split(',')[0]?.trim() || '';
            const venueCity = venue.split(',')[0]?.trim() || '';
            
            console.log(`\n${index + 1}. "${event.title}"`);
            console.log(`   Mobile app would see:`);
            console.log(`   - cityFromLocation: "${cityFromLocation}"`);
            console.log(`   - venueCity: "${venueCity}"`);
            console.log(`   - location contains "montreal": ${location.toLowerCase().includes('montreal')}`);
            console.log(`   - venue contains "montreal": ${venue.toLowerCase().includes('montreal')}`);
            
            // Test the filtering logic
            const normalizedCityFromLocation = cityFromLocation.toLowerCase();
            const normalizedVenueCity = venueCity.toLowerCase();
            const normalizedFilterCity = 'montreal';
            
            const wouldMatch = 
                normalizedCityFromLocation === normalizedFilterCity ||
                normalizedVenueCity === normalizedFilterCity ||
                location.toLowerCase().includes(normalizedFilterCity) ||
                venue.toLowerCase().includes(normalizedFilterCity);
                
            console.log(`   ✅ Would match Montreal filter: ${wouldMatch}`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🚨 INVESTIGATING: Over-filtering of Montreal events (42 vs expected ~497)');
debugOverFiltering();
