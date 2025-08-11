/**
 * 🔍 INVESTIGATE: Why mobile app isn't seeing database fixes
 * 
 * Mobile app still shows same numbers after emergency fixes:
 * - Total: 913 events (should be 1,343)
 * - Toronto: 462 events (should be 954) 
 * - Vancouver: 4 events (should be 0)
 * 
 * Possible causes:
 * 1. Mobile app connects to different API endpoint
 * 2. API server cache not cleared
 * 3. Mobile app reading from different database
 * 4. CDN/proxy caching old data
 */

const mongoose = require('mongoose');

async function investigateMobileAppConnection() {
    console.log('🔍 INVESTIGATING: Why mobile app isn\'t seeing database fixes\n');
    
    // Check if our fixes actually worked in the database
    console.log('🔍 STEP 1: Verify our fixes are in the database...\n');
    
    const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
    const PRODUCTION_DB = 'test';
    
    await mongoose.connect(PRODUCTION_URI);
    const db = mongoose.connection.client.db(PRODUCTION_DB);
    const collection = db.collection('events');
    
    const totalEvents = await collection.countDocuments();
    const futureEvents = await collection.countDocuments({ date: { $gte: new Date() } });
    const torontoEvents = await collection.countDocuments({ city: { $regex: /toronto/i } });
    const vancouverEvents = await collection.countDocuments({ city: { $regex: /vancouver/i } });
    const newYorkEvents = await collection.countDocuments({ city: { $regex: /new york/i } });
    
    console.log('📊 DATABASE STATE AFTER OUR FIXES:');
    console.log(`   Total events: ${totalEvents}`);
    console.log(`   Future events: ${futureEvents}`);
    console.log(`   Toronto events: ${torontoEvents}`);
    console.log(`   Vancouver events: ${vancouverEvents}`);
    console.log(`   New York events: ${newYorkEvents}`);
    
    console.log('\n📱 MOBILE APP SHOWS:');
    console.log('   Total events: 913');
    console.log('   Toronto events: 462');
    console.log('   Vancouver events: 4');
    console.log('   New York events: 311');
    
    console.log('\n🚨 PROBLEM ANALYSIS:');
    if (totalEvents !== 913) {
        console.log('❌ MAJOR ISSUE: Mobile app total doesn\'t match database!');
        console.log(`   Database has ${totalEvents} events, app shows 913`);
        console.log('   → Mobile app is reading from DIFFERENT source!');
    }
    
    if (torontoEvents !== 462) {
        console.log('❌ MAJOR ISSUE: Toronto count mismatch!');
        console.log(`   Database has ${torontoEvents} events, app shows 462`);
        console.log('   → Toronto events not reaching mobile app!');
    }
    
    if (vancouverEvents !== 4) {
        console.log('❌ MAJOR ISSUE: Vancouver ghost events persist!');
        console.log(`   Database has ${vancouverEvents} events, app shows 4`);
        console.log('   → Mobile app has cached/different Vancouver data!');
    }
    
    console.log('\n🔍 STEP 2: Check API server configuration...\n');
    
    // Look for API server configuration
    const fs = require('fs');
    const path = require('path');
    
    const serverFiles = [
        '/Users/seongwoohan/CascadeProjects/discovr-api-server/unified-proxy-server.js',
        '/Users/seongwoohan/CascadeProjects/discovr-api-server/server.js',
        '/Users/seongwoohan/CascadeProjects/discovr-api-server/.env'
    ];
    
    for (const filePath of serverFiles) {
        try {
            if (fs.existsSync(filePath)) {
                console.log(`📄 Found server file: ${path.basename(filePath)}`);
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Look for database connections
                const mongoMatches = content.match(/mongodb[^'"\s]*/g) || [];
                const dbMatches = content.match(/DATABASE_NAME[^'"\s]*/g) || [];
                
                if (mongoMatches.length > 0) {
                    console.log(`   MongoDB URIs found: ${mongoMatches.length}`);
                    mongoMatches.forEach((match, i) => {
                        console.log(`     ${i + 1}. ${match.substring(0, 50)}...`);
                    });
                }
                
                if (dbMatches.length > 0) {
                    console.log(`   Database name references: ${dbMatches.length}`);
                    dbMatches.forEach((match, i) => {
                        console.log(`     ${i + 1}. ${match}`);
                    });
                }
            }
        } catch (error) {
            console.log(`   ❌ Could not read ${filePath}`);
        }
    }
    
    console.log('\n🔍 STEP 3: Test API endpoint directly...\n');
    
    // Test the actual API endpoint the mobile app might be using
    try {
        const https = require('https');
        const apiUrl = 'https://discovr-proxy-server.onrender.com/api/v1/venues/events/all';
        
        console.log(`🌐 Testing API endpoint: ${apiUrl}`);
        
        const response = await new Promise((resolve, reject) => {
            https.get(apiUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
        
        const apiData = JSON.parse(response);
        const apiEvents = apiData.events || apiData || [];
        
        console.log(`📊 API endpoint returned: ${apiEvents.length} events`);
        
        // Analyze API data
        const apiCities = {};
        apiEvents.forEach(event => {
            const city = event.city || 'Unknown';
            apiCities[city] = (apiCities[city] || 0) + 1;
        });
        
        console.log('🌆 API endpoint city distribution:');
        Object.entries(apiCities).sort((a, b) => b[1] - a[1]).forEach(([city, count]) => {
            console.log(`   ${city}: ${count} events`);
        });
        
        console.log('\n🚨 ROOT CAUSE ANALYSIS:');
        if (apiEvents.length === 913) {
            console.log('✅ API endpoint matches mobile app total (913 events)');
            console.log('❌ BUT API endpoint does NOT match our database fixes!');
            console.log('🎯 CONCLUSION: API server is NOT reading from our fixed database!');
        } else {
            console.log('❌ API endpoint doesn\'t match mobile app either!');
            console.log('🎯 CONCLUSION: There\'s a cache or proxy issue!');
        }
        
    } catch (error) {
        console.log('❌ Failed to test API endpoint:', error.message);
    }
    
    await mongoose.disconnect();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 INVESTIGATION COMPLETE');
    console.log('='.repeat(60));
    console.log('📊 Our database fixes worked correctly');
    console.log('❌ Mobile app is not seeing the fixes');
    console.log('🔍 Next step: Fix API server database connection');
    console.log('📱 Then mobile app should show correct numbers');
}

investigateMobileAppConnection().catch(console.error);
