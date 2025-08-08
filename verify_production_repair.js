/**
 * CRITICAL PRODUCTION VERIFICATION
 * Our repair claimed 389 NYC events but app still shows 4
 * This script verifies if the repair actually took effect in production
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function verifyProductionRepair() {
  try {
    console.log('🚨 VERIFYING PRODUCTION REPAIR EFFECTIVENESS...\n');
    console.log('🎯 Repair claimed: 389 NYC events with venue.city = "New York"');
    console.log('📱 App still shows: 4 NYC events');
    console.log('❓ Goal: Verify if repair actually applied\n');

    // Test 1: Direct Production Database Check
    console.log('🔍 TEST 1: DIRECT PRODUCTION DATABASE CHECK');
    console.log('=' .repeat(50));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Production MongoDB');

    const Event = require('./models/Event');

    // Count events with venue.city = "New York"
    const nycVenueCityCount = await Event.countDocuments({
      'venue.city': { $regex: /new york/i }
    });

    console.log(`📊 Events with venue.city = "New York": ${nycVenueCityCount}`);

    // Count all events that should be NYC
    const allPotentialNYC = await Event.countDocuments({
      $or: [
        { location: { $regex: /new york|nyc|manhattan|brooklyn/i } },
        { 'venue.name': { $regex: /new york|nyc|manhattan|brooklyn/i } },
        { 'venue.address': { $regex: /new york|nyc|manhattan|brooklyn/i } },
        { title: { $regex: /new york|nyc|manhattan|brooklyn/i } }
      ]
    });

    console.log(`🔍 Total potential NYC events: ${allPotentialNYC}`);
    console.log(`❓ Gap: ${allPotentialNYC - nycVenueCityCount} events without proper venue.city`);

    // Sample NYC events to verify data
    const sampleNYCEvents = await Event.find({
      'venue.city': { $regex: /new york/i }
    }).limit(5);

    console.log('\n📋 SAMPLE NYC EVENTS WITH VENUE.CITY:');
    sampleNYCEvents.forEach((event, i) => {
      console.log(`${i + 1}. "${event.title}"`);
      console.log(`   Venue: ${event.venue?.name || 'N/A'}`);
      console.log(`   Venue City: ${event.venue?.city || 'N/A'}`);
      console.log(`   Location: ${event.location || 'N/A'}`);
      console.log('');
    });

    await mongoose.connection.close();

    // Test 2: Production API Direct Check
    console.log('\n🔍 TEST 2: PRODUCTION API DIRECT CHECK');
    console.log('=' .repeat(40));

    try {
      const apiResponse = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all', {
        params: { city: 'New York' },
        timeout: 30000
      });

      const apiNYCCount = apiResponse.data.events ? apiResponse.data.events.length : 0;
      console.log(`🌐 Production API NYC events: ${apiNYCCount}`);

      if (apiNYCCount === 4) {
        console.log('❌ PROBLEM: API returns same count as app - repair didn\'t take effect');
      } else if (apiNYCCount === nycVenueCityCount) {
        console.log('✅ GOOD: API matches database venue.city count');
      } else {
        console.log(`❓ MISMATCH: API (${apiNYCCount}) vs Database (${nycVenueCityCount})`);
      }

      // Sample API events
      if (apiResponse.data.events && apiResponse.data.events.length > 0) {
        console.log('\n📋 SAMPLE NYC EVENTS FROM PRODUCTION API:');
        apiResponse.data.events.slice(0, 3).forEach((event, i) => {
          console.log(`${i + 1}. "${event.title}"`);
          console.log(`   Venue City: ${event.venue?.city || 'N/A'}`);
          console.log(`   Location: ${event.location || 'N/A'}`);
          console.log('');
        });
      }

    } catch (apiError) {
      console.log(`❌ API Error: ${apiError.message}`);
    }

    // Test 3: Diagnosis Summary
    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('=' .repeat(30));

    if (nycVenueCityCount < 50) {
      console.log('❌ CRITICAL: Very few events have venue.city = "New York"');
      console.log('💡 Likely cause: Repair script didn\'t apply to production database');
      console.log('🔧 Solution: Re-run repair script with proper production connection');
    } else if (nycVenueCityCount > 200) {
      console.log('✅ DATABASE: Good number of NYC events in database');
      console.log('❓ MYSTERY: Why does app only see 4 events?');
      console.log('💡 Possible causes:');
      console.log('   - App cache not cleared');
      console.log('   - Server restart needed');
      console.log('   - API filtering logic issue');
    } else {
      console.log('⚠️ PARTIAL: Some repair applied but not complete');
    }

    console.log('\n🚀 RECOMMENDED NEXT STEPS:');
    if (nycVenueCityCount < 100) {
      console.log('1. Re-run venue.city repair with verified production connection');
      console.log('2. Verify database connection string points to correct production DB');
    } else {
      console.log('1. Force production server restart');
      console.log('2. Clear any API/server-side caching');
      console.log('3. Test app with force refresh');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyProductionRepair().catch(console.error);
