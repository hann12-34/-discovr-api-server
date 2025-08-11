/**
 * 🔍 VERIFY ACTUAL DATABASE EVENT COUNTS
 * 
 * Check if mobile app results match actual database:
 * Mobile App Shows:
 * - Total: 913 events (from 978 after date filtering)
 * - Toronto: 462 events  
 * - Vancouver: 4 events
 * - New York: 311 events
 */

const mongoose = require('mongoose');

const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
const PRODUCTION_DB = 'test'; // The unified database

async function verifyEventCounts() {
    console.log('🔍 VERIFYING ACTUAL DATABASE EVENT COUNTS\n');
    
    await mongoose.connect(PRODUCTION_URI);
    const db = mongoose.connection.client.db(PRODUCTION_DB);
    const collection = db.collection('events');
    
    // Get total counts
    const totalEvents = await collection.countDocuments();
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    // Get city distribution
    console.log('\n🌆 CITY DISTRIBUTION:');
    
    // Toronto events
    const torontoEvents = await collection.countDocuments({ 
        city: { $regex: /toronto/i } 
    });
    console.log(`🍁 Toronto events: ${torontoEvents}`);
    
    // New York events
    const newYorkEvents = await collection.countDocuments({ 
        city: { $regex: /new york/i } 
    });
    console.log(`🗽 New York events: ${newYorkEvents}`);
    
    // Vancouver events
    const vancouverEvents = await collection.countDocuments({ 
        city: { $regex: /vancouver/i } 
    });
    console.log(`🏔️ Vancouver events: ${vancouverEvents}`);
    
    // Get all unique cities to see what else we have
    console.log('\n🔍 ALL UNIQUE CITIES IN DATABASE:');
    const allCities = await collection.distinct('city');
    for (const city of allCities.sort()) {
        if (city) {
            const count = await collection.countDocuments({ city: city });
            console.log(`   ${city}: ${count} events`);
        }
    }
    
    // Check for any events without city
    const noCityEvents = await collection.countDocuments({ 
        $or: [
            { city: { $exists: false } },
            { city: null },
            { city: '' }
        ]
    });
    console.log(`\n❓ Events without city: ${noCityEvents}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('📱 MOBILE APP VS DATABASE COMPARISON:');
    console.log('='.repeat(50));
    
    console.log('📱 Mobile App Shows:');
    console.log('   Total: 913 events (after date filtering from 978)');
    console.log('   Toronto: 462 events');
    console.log('   Vancouver: 4 events');
    console.log('   New York: 311 events');
    
    console.log('\n📊 Database Actually Has:');
    console.log(`   Total: ${totalEvents} events`);
    console.log(`   Toronto: ${torontoEvents} events`);
    console.log(`   Vancouver: ${vancouverEvents} events`);
    console.log(`   New York: ${newYorkEvents} events`);
    
    // Calculate differences
    console.log('\n🔍 ANALYSIS:');
    console.log(`   Database vs Mobile App Total: ${totalEvents} vs 913 (difference: ${totalEvents - 913})`);
    console.log(`   Database vs Mobile App Toronto: ${torontoEvents} vs 462 (difference: ${torontoEvents - 462})`);
    console.log(`   Database vs Mobile App Vancouver: ${vancouverEvents} vs 4 (difference: ${vancouverEvents - 4})`);
    console.log(`   Database vs Mobile App New York: ${newYorkEvents} vs 311 (difference: ${newYorkEvents - 311})`);
    
    // Check date filtering impact
    console.log('\n⏰ DATE FILTERING ANALYSIS:');
    const futureEvents = await collection.countDocuments({
        date: { $gte: new Date() }
    });
    console.log(`   Future events: ${futureEvents}`);
    console.log(`   Past events: ${totalEvents - futureEvents}`);
    console.log(`   Mobile shows 913 after date filtering from 978 total`);
    console.log(`   This suggests some events are being filtered out by date`);
    
    await mongoose.disconnect();
    
    console.log('\n🎯 CONCLUSION:');
    if (totalEvents !== 913) {
        console.log('❓ There may be a discrepancy between database and mobile app!');
        console.log('   Possible causes:');
        console.log('   - Date filtering is hiding some events');
        console.log('   - Mobile app cache needs refresh');
        console.log('   - Some events have invalid dates or formats');
    } else {
        console.log('✅ Database and mobile app counts match perfectly!');
    }
}

verifyEventCounts().catch(console.error);
