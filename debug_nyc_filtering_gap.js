/**
 * DEBUG NYC FILTERING GAP
 * Database has 794 events with "New York" in location
 * App only shows 10 events after city filtering
 * Need to find what's causing this massive gap
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

async function debugNYCFilteringGap() {
  try {
    console.log('🔍 DEBUGGING NYC FILTERING GAP...\n');
    console.log('📊 Database claims: 794 events with "New York" in location');
    console.log('📱 App shows: 10 events after city filtering');
    console.log('❓ Gap: 784 missing events - WHY?\n');

    // Connect to local database to verify our claim
    await mongoose.connect(process.env.MONGODB_URI);
    const Event = require('./models/Event');

    console.log('🎯 STEP 1: VERIFY DATABASE COUNTS');
    console.log('=' .repeat(40));
    
    const totalEvents = await Event.countDocuments({});
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    const nycLocationEvents = await Event.countDocuments({
      location: { $regex: /new york/i }
    });
    console.log(`📍 Events with "New York" in location: ${nycLocationEvents}`);
    
    const nycVenueNameEvents = await Event.countDocuments({
      'venue.name': { $regex: /new york/i }
    });
    console.log(`🏟️ Events with "New York" in venue.name: ${nycVenueNameEvents}`);
    
    const nycVenueCityEvents = await Event.countDocuments({
      'venue.city': { $regex: /new york/i }
    });
    console.log(`🏢 Events with "New York" in venue.city: ${nycVenueCityEvents}`);

    console.log('\n🎯 STEP 2: TEST PRODUCTION API RESPONSE');
    console.log('=' .repeat(45));
    
    const baseURL = 'https://discovr-proxy-server.onrender.com/api/v1/venues/events/all';
    
    // Test different API filtering approaches
    const tests = [
      { name: 'NO FILTER', url: baseURL },
      { name: 'CITY=New York', url: `${baseURL}?city=New York` },
      { name: 'CITY=new york', url: `${baseURL}?city=new york` }
    ];

    for (const test of tests) {
      try {
        console.log(`\n🧪 Testing: ${test.name}`);
        const response = await axios.get(test.url, { timeout: 30000 });
        const events = response.data.events || [];
        console.log(`📊 API returned: ${events.length} events`);
        
        if (events.length > 0) {
          // Count how many have "New York" in different fields
          let locationMatches = 0;
          let venueNameMatches = 0;
          let venueCityMatches = 0;
          let titleMatches = 0;
          
          for (const event of events) {
            const location = (event.location || '').toLowerCase();
            const venueName = (event.venue?.name || '').toLowerCase();
            const venueCity = (event.venue?.city || '').toLowerCase();
            const title = (event.title || '').toLowerCase();
            
            if (location.includes('new york')) locationMatches++;
            if (venueName.includes('new york')) venueNameMatches++;
            if (venueCity.includes('new york')) venueCityMatches++;
            if (title.includes('new york')) titleMatches++;
          }
          
          console.log(`   📍 With "New York" in location: ${locationMatches}`);
          console.log(`   🏟️ With "New York" in venue.name: ${venueNameMatches}`);
          console.log(`   🏢 With "New York" in venue.city: ${venueCityMatches}`);
          console.log(`   📝 With "New York" in title: ${titleMatches}`);
          
          if (locationMatches === 10) {
            console.log('🎯 MATCH! API location count matches app output (10)');
            console.log('🔍 This suggests app filters by location field correctly');
            console.log('❓ But why only 10 when we have 794 in local database?');
          }
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    console.log('\n🎯 STEP 3: ANALYZE DATABASE-API MISMATCH');
    console.log('=' .repeat(45));
    
    if (nycLocationEvents !== 10) {
      console.log('🚨 CRITICAL MISMATCH DETECTED!');
      console.log(`   📊 Local database: ${nycLocationEvents} NYC location events`);
      console.log(`   🌐 Production API: ~10 NYC location events`);
      console.log('   💡 This means our local fixes didn\'t reach production!');
      
      console.log('\n🔍 SAMPLE LOCAL NYC EVENTS:');
      const sampleNYC = await Event.find({
        location: { $regex: /new york/i }
      }).limit(5).lean();
      
      sampleNYC.forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   Location: "${event.location}"`);
        console.log(`   Scraper: ${event.scraper || event.source || 'N/A'}`);
        console.log('');
      });
    }

    console.log('\n🎯 STEP 4: DEPLOYMENT STATUS CHECK');
    console.log('=' .repeat(40));
    
    console.log('🚨 LIKELY ISSUE: Our location normalization was applied to LOCAL database');
    console.log('📡 But the app connects to PRODUCTION database on Render.com');
    console.log('🔄 We need to deploy our location fixes to production!');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. 🚀 Deploy location normalization to Render.com production');
    console.log('2. 🔄 Restart production server to clear caches');
    console.log('3. 📱 Test app with updated production data');
    console.log('4. 🎯 Should see ~794 NYC events instead of 10');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

debugNYCFilteringGap().catch(console.error);
