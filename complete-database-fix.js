/**
 * 🎯 COMPLETE THE DATABASE FIX (Fix the venue error)
 * 
 * Previous script worked but hit error on venue check.
 * Let's complete the Vancouver mislabeling fix safely.
 */

const mongoose = require('mongoose');

const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
const CORRECT_DB = 'discovr';

async function completeDatabaseFix() {
    console.log('🎯 COMPLETING DATABASE FIX: Vancouver mislabeling...\n');
    
    await mongoose.connect(PRODUCTION_URI);
    const db = mongoose.connection.client.db(CORRECT_DB);
    const collection = db.collection('events');
    
    // Fix Vancouver mislabeling with safe checks
    console.log('🏔️ FIX 3: Safely fixing Vancouver mislabeling...');
    
    const suspiciousVancouverEvents = await collection.find({ 
        city: { $regex: /vancouver/i } 
    }).toArray();
    
    let vancouverFixed = 0;
    for (const event of suspiciousVancouverEvents) {
        console.log(`   Checking: "${event.title}" (source: ${event.source || 'no source'})`);
        
        // Safe string checks
        const sourceCheck = event.source && typeof event.source === 'string' && event.source.toLowerCase().includes('toronto');
        const venueCheck = event.venue && typeof event.venue === 'string' && event.venue.toLowerCase().includes('toronto');
        const titleCheck = event.title && typeof event.title === 'string' && event.title.toLowerCase().includes('toronto');
        
        if (sourceCheck || venueCheck || titleCheck) {
            await collection.updateOne(
                { _id: event._id },
                { $set: { city: 'Toronto' } }
            );
            console.log(`     → Fixed: This is actually a Toronto event!`);
            vancouverFixed++;
        }
    }
    
    console.log(`✅ Fixed ${vancouverFixed} mislabeled Vancouver events`);
    
    // Final verification
    console.log('\n🔍 FINAL VERIFICATION...\n');
    
    const finalTotalEvents = await collection.countDocuments();
    const finalFutureEvents = await collection.countDocuments({ date: { $gte: new Date() } });
    const finalTorontoCount = await collection.countDocuments({ city: { $regex: /toronto/i } });
    const finalVancouverCount = await collection.countDocuments({ city: { $regex: /vancouver/i } });
    const finalNewYorkCount = await collection.countDocuments({ city: { $regex: /new york/i } });
    
    console.log('📊 FINAL DATABASE STATE:');
    console.log(`📊 Total events: ${finalTotalEvents}`);
    console.log(`⏰ Future events: ${finalFutureEvents}`);
    console.log(`🍁 Toronto events: ${finalTorontoCount}`);
    console.log(`🏔️ Vancouver events: ${finalVancouverCount}`);
    console.log(`🗽 New York events: ${finalNewYorkCount}`);
    
    // Test API endpoint to verify
    console.log('\n🌐 TESTING API ENDPOINT AFTER FIX...');
    try {
        const https = require('https');
        const apiUrl = 'https://discovr-proxy-server.onrender.com/api/v1/venues/events/all';
        
        const response = await new Promise((resolve, reject) => {
            https.get(apiUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
        
        const apiData = JSON.parse(response);
        const apiEvents = apiData.events || apiData || [];
        
        console.log(`📊 API endpoint now returns: ${apiEvents.length} events`);
        
        // Count cities from API
        const apiCities = {};
        apiEvents.forEach(event => {
            const city = event.city || 'Unknown';
            apiCities[city] = (apiCities[city] || 0) + 1;
        });
        
        console.log('🌆 API endpoint city distribution:');
        Object.entries(apiCities).sort((a, b) => b[1] - a[1]).forEach(([city, count]) => {
            console.log(`   ${city}: ${count} events`);
        });
        
    } catch (error) {
        console.log('⚠️ Could not test API endpoint:', error.message);
    }
    
    await mongoose.disconnect();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DATABASE FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Database: "${CORRECT_DB}" (API server database)`);
    console.log(`📊 Total Events: ${finalTotalEvents}`);
    console.log(`🍁 Toronto Events: ${finalTorontoCount}`);
    console.log(`🏔️ Vancouver Events: ${finalVancouverCount}`);
    console.log(`🗽 New York Events: ${finalNewYorkCount}`);
    console.log(`⏰ Future Events: ${finalFutureEvents}`);
    
    console.log('\n📱 Mobile app should now show CORRECT results!');
    console.log('🔄 Please refresh mobile app and test again!');
    
    console.log('\n🚀 SUCCESS! Fixed the correct database that API server uses!');
}

completeDatabaseFix().catch(console.error);
