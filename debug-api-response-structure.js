require('dotenv').config();
const mongoose = require('mongoose');

async function checkAPIResponseStructure() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get a few events from each city and check their complete structure
        const cityQueries = [
            { city: "Vancouver", limit: 2 },
            { city: "Toronto", limit: 2 },
            { city: "Calgary", limit: 2 },
            { city: "Montreal", limit: 2 }
        ];

        for (const query of cityQueries) {
            console.log(`\n=== ${query.city.toUpperCase()} EVENTS - COMPLETE STRUCTURE ===`);
            
            const events = await mongoose.connection.db.collection('events')
                .find({ city: query.city })
                .limit(query.limit)
                .toArray();

            events.forEach((event, index) => {
                console.log(`\n${index + 1}. Title: "${event.title}"`);
                console.log(`   _id: ${event._id}`);
                console.log(`   city: "${event.city}"`);
                console.log(`   province: "${event.province}"`);
                console.log(`   country: "${event.country}"`);
                
                // Check all fields that might affect filtering
                const relevantFields = {
                    city: event.city,
                    province: event.province,
                    country: event.country,
                    status: event.status,
                    featured: event.featured,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    venue: event.venue
                };

                console.log(`   Relevant fields:`, JSON.stringify(relevantFields, null, 4));
            });
        }

        // Check if there are any NULL or undefined province/country fields for Calgary/Montreal
        console.log('\n=== CHECKING FOR NULL/UNDEFINED FIELDS ===');
        
        const fieldChecks = [
            { city: "Calgary", field: "province" },
            { city: "Calgary", field: "country" },
            { city: "Montreal", field: "province" },
            { city: "Montreal", field: "country" }
        ];

        for (const check of fieldChecks) {
            const nullCount = await mongoose.connection.db.collection('events')
                .countDocuments({ 
                    city: check.city,
                    [check.field]: { $in: [null, undefined, ""] }
                });
            
            const totalCount = await mongoose.connection.db.collection('events')
                .countDocuments({ city: check.city });

            console.log(`${check.city} - ${check.field}: ${nullCount}/${totalCount} events have null/empty values`);
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🔍 Checking API response structure for city filtering issues...');
checkAPIResponseStructure();
