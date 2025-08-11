/**
 * 🚨 DIAGNOSE DATABASE MISMATCH CRISIS
 * 
 * Master scraper claims 89 Toronto events (681 total)
 * Mobile app shows 7 Toronto events (317 total)
 * 
 * They're clearly using different databases!
 */

const mongoose = require('mongoose');
const axios = require('axios');

const possibleURIs = [
    // Original URI we used for emergency insert
    'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
    
    // Alternative cluster names
    'mongodb+srv://discovr123:discovr1234@cluster0.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
];

async function diagnoseDatabaseMismatch() {
    console.log('🚨 DIAGNOSING DATABASE MISMATCH CRISIS\n');
    
    // Step 1: Check what production API serves
    console.log('📡 STEP 1: Production API Analysis');
    console.log('=' .repeat(50));
    
    try {
        const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
        const events = response.data.events || response.data;
        
        console.log(`📊 Production API Total Events: ${events.length}`);
        
        // Count by city
        const cityCounts = {};
        events.forEach(event => {
            const city = event.city || 'Unknown';
            cityCounts[city] = (cityCounts[city] || 0) + 1;
        });
        
        console.log('🏙️ Production API Events by City:');
        Object.entries(cityCounts).forEach(([city, count]) => {
            console.log(`   ${city}: ${count} events`);
        });
        
    } catch (error) {
        console.error('❌ Production API Error:', error.message);
    }
    
    // Step 2: Check each possible database
    console.log('\n🔍 STEP 2: Database URI Analysis');
    console.log('=' .repeat(50));
    
    for (const [index, uri] of possibleURIs.entries()) {
        console.log(`\n🔍 Database ${index + 1}: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
        
        try {
            await mongoose.connect(uri);
            const db = mongoose.connection.db;
            
            // Try different database names
            const databases = ['test', 'discovr', 'events', 'production'];
            
            for (const dbName of databases) {
                try {
                    const targetDb = mongoose.connection.client.db(dbName);
                    const eventsCollection = targetDb.collection('events');
                    const totalEvents = await eventsCollection.countDocuments();
                    
                    if (totalEvents > 0) {
                        console.log(`📊 Database "${dbName}": ${totalEvents} total events`);
                        
                        // Count by city
                        const pipeline = [
                            { $group: { _id: '$city', count: { $sum: 1 } } },
                            { $sort: { count: -1 } }
                        ];
                        
                        const cityCounts = await eventsCollection.aggregate(pipeline).toArray();
                        cityCounts.forEach(({ _id, count }) => {
                            console.log(`     ${_id || 'Unknown'}: ${count} events`);
                        });
                        
                        // Check if this matches mobile app (317 events)
                        if (totalEvents >= 315 && totalEvents <= 320) {
                            console.log(`🎯 *** THIS MATCHES MOBILE APP DATA! ***`);
                        }
                        
                        // Check if this matches master scraper (681 events)
                        if (totalEvents >= 680 && totalEvents <= 685) {
                            console.log(`🎯 *** THIS MATCHES MASTER SCRAPER DATA! ***`);
                        }
                    }
                } catch (error) {
                    // Skip databases that don't exist
                }
            }
            
            await mongoose.disconnect();
            
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}`);
        }
        
        console.log('-' .repeat(30));
    }
    
    console.log('\n🎯 CONCLUSION:');
    console.log('Find which database has 317 events (mobile app data)');
    console.log('Find which database has 681 events (master scraper data)');
    console.log('The master scraper needs to write to the mobile app database!');
}

// Run the diagnosis
diagnoseDatabaseMismatch().catch(console.error);
