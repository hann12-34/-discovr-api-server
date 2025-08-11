/**
 * 🎯 FIND THE REAL PRODUCTION DATABASE
 * 
 * The mobile app successfully gets 282 New York events from discovr-proxy-server.onrender.com
 * This means there IS a working production database. We need to find its exact URI.
 */

const mongoose = require('mongoose');
const axios = require('axios');

async function findRealProductionDatabase() {
    console.log('🔍 FINDING THE REAL PRODUCTION DATABASE...\n');
    
    // Step 1: Check what the production API actually returns
    console.log('📡 STEP 1: Testing production API...');
    try {
        const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
        const events = response.data.events || response.data;
        
        console.log(`✅ Production API responds with ${events.length} events`);
        
        // Count by city
        const cityCounts = {};
        events.forEach(event => {
            const city = event.city || 'Unknown';
            cityCounts[city] = (cityCounts[city] || 0) + 1;
        });
        
        console.log('📊 Events by city from production API:');
        Object.entries(cityCounts).forEach(([city, count]) => {
            console.log(`   ${city}: ${count} events`);
        });
        
    } catch (error) {
        console.error('❌ Failed to contact production API:', error.message);
    }
    
    // Step 2: Try different known database URIs
    console.log('\n🔌 STEP 2: Testing different database URIs...');
    
    const possibleURIs = [
        // Original URI we were using
        'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
        
        // URI from switch script (has typo?)
        'mongodb+srv://discovr123:discovr1234@discovr.vzlmgdb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
        
        // Try different cluster names
        'mongodb+srv://discovr123:discovr1234@cluster0.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
        'mongodb+srv://discovr123:discovr1234@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
        
        // Alternative credentials or cluster
        'mongodb+srv://discovr:discovr@cluster0.mongodb.net/?retryWrites=true&w=majority',
    ];
    
    for (const uri of possibleURIs) {
        console.log(`\n🔍 Testing: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
        
        try {
            await mongoose.connect(uri);
            console.log('✅ Connection successful!');
            
            const db = mongoose.connection.db;
            console.log(`📊 Database name: ${db.databaseName}`);
            
            // Check collections
            const collections = await db.listCollections().toArray();
            console.log(`📁 Collections: ${collections.map(c => c.name).join(', ')}`);
            
            // Count events
            const eventsCollection = db.collection('events');
            const totalEvents = await eventsCollection.countDocuments();
            console.log(`📈 Total events: ${totalEvents}`);
            
            if (totalEvents > 0) {
                // Count by city
                const pipeline = [
                    { $group: { _id: '$city', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ];
                
                const cityCounts = await eventsCollection.aggregate(pipeline).toArray();
                console.log('🏙️ Events by city in database:');
                cityCounts.forEach(({ _id, count }) => {
                    console.log(`   ${_id || 'Unknown'}: ${count} events`);
                });
                
                // Check if this matches the production API
                if (totalEvents >= 280 && totalEvents <= 400) {
                    console.log('🎯 THIS MIGHT BE THE PRODUCTION DATABASE!');
                    console.log(`📋 Save this URI: ${uri}`);
                }
            }
            
            await mongoose.disconnect();
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }
    
    console.log('\n🎯 CONCLUSION:');
    console.log('The working production database URI should match the API response counts.');
    console.log('Use that URI to import Toronto events to the correct database.');
}

// Run the diagnostic
findRealProductionDatabase().catch(console.error);
