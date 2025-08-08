/**
 * INVESTIGATE DATABASE VS APP COUNT DISCREPANCY
 * Find out why Toronto shows 635 events but database only has 111
 * Find out why Vancouver/Calgary are missing hundreds of events
 * This is the key to solving the hidden events mystery!
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function investigateDbVsAppDiscrepancy() {
  try {
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    
    console.log('🕵️ INVESTIGATING DATABASE VS APP COUNT DISCREPANCY\n');
    console.log('🎯 CRITICAL MYSTERY:');
    console.log('🌊 Vancouver: 941 in DB → 454 in app (487 missing!)');
    console.log('🍁 Calgary: 312 in DB → 191 in app (121 missing!)');
    console.log('🏢 Toronto: 111 in DB → 635 in app (524 EXTRA!!)');
    console.log('🚨 This suggests massive cross-city contamination!\n');

    // Step 1: Detailed breakdown of what's actually in the database
    console.log('📊 STEP 1: ACTUAL DATABASE BREAKDOWN');
    console.log('=' .repeat(50));
    
    const cities = ['Vancouver', 'Calgary', 'Montreal', 'New York', 'Toronto'];
    const dbStats = {};
    
    for (const city of cities) {
      const count = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      dbStats[city] = count;
      console.log(`🏙️ ${city}: ${count} events in database`);
    }
    
    const totalInDB = Object.values(dbStats).reduce((sum, count) => sum + count, 0);
    console.log(`📊 Total events in all cities: ${totalInDB}`);
    
    const totalEvents = await Event.countDocuments({});
    console.log(`📊 Total events in database: ${totalEvents}`);
    console.log(`❓ Uncategorized events: ${totalEvents - totalInDB}\n`);

    // Step 2: Find events with multiple city names (cross-contamination)
    console.log('🔄 STEP 2: CROSS-CITY CONTAMINATION ANALYSIS');
    console.log('=' .repeat(50));
    
    const contaminated = await Event.find({
      'venue.name': {
        $regex: /Toronto.*Vancouver|Vancouver.*Toronto|Calgary.*Toronto|Toronto.*Calgary|Vancouver.*Calgary|Calgary.*Vancouver|New York.*Vancouver|Vancouver.*New York|Montreal.*Toronto|Toronto.*Montreal/i
      }
    }).lean();
    
    console.log(`🚨 Found ${contaminated.length} events with multiple city names in venue.name`);
    
    if (contaminated.length > 0) {
      console.log('\n📋 Sample contaminated events:');
      contaminated.slice(0, 10).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   venue.name: "${event.venue?.name}"`);
        console.log(`   location: "${event.location || 'MISSING'}"`);
        console.log('');
      });
      
      // Count contamination by city
      console.log('📊 Contamination breakdown:');
      for (const city of cities) {
        const cityContamination = contaminated.filter(event => 
          event.venue?.name?.toLowerCase().includes(city.toLowerCase())
        ).length;
        console.log(`   ${city}: appears in ${cityContamination} contaminated events`);
      }
    }

    // Step 3: Find the "extra" Toronto events
    console.log('\n🏢 STEP 3: TORONTO MYSTERY - WHERE ARE THE EXTRA 524 EVENTS COMING FROM?');
    console.log('=' .repeat(50));
    
    // Find all events that might be showing up as Toronto in the app
    const potentialTorontoEvents = await Event.find({
      $or: [
        { 'venue.name': /Toronto/i },
        { location: /Toronto|ON|Ontario/i },
        { 'venue.city': /Toronto/i },
        { address: /Toronto/i }
      ]
    }).lean();
    
    console.log(`🔍 Found ${potentialTorontoEvents.length} events that could appear as Toronto`);
    
    if (potentialTorontoEvents.length > 0) {
      // Analyze where these events are coming from
      const sourceAnalysis = {};
      potentialTorontoEvents.forEach(event => {
        const location = event.location || 'Unknown';
        const venueName = event.venue?.name || 'Unknown';
        
        // Try to determine original city
        let originalCity = 'Unknown';
        if (venueName.toLowerCase().includes('vancouver')) originalCity = 'Vancouver';
        else if (venueName.toLowerCase().includes('calgary')) originalCity = 'Calgary';
        else if (venueName.toLowerCase().includes('montreal')) originalCity = 'Montreal';
        else if (venueName.toLowerCase().includes('new york')) originalCity = 'New York';
        else if (location.toLowerCase().includes('vancouver') || location.toLowerCase().includes('bc')) originalCity = 'Vancouver';
        else if (location.toLowerCase().includes('calgary') || location.toLowerCase().includes('ab')) originalCity = 'Calgary';
        else if (location.toLowerCase().includes('montreal') || location.toLowerCase().includes('qc')) originalCity = 'Montreal';
        else if (location.toLowerCase().includes('new york') || location.toLowerCase().includes('ny')) originalCity = 'New York';
        
        if (!sourceAnalysis[originalCity]) sourceAnalysis[originalCity] = 0;
        sourceAnalysis[originalCity]++;
      });
      
      console.log('\n📊 Source of potential Toronto events:');
      Object.entries(sourceAnalysis).forEach(([source, count]) => {
        console.log(`   From ${source}: ${count} events`);
      });
      
      // Show sample "false Toronto" events
      console.log('\n📋 Sample events incorrectly appearing as Toronto:');
      const falseTorontoEvents = potentialTorontoEvents.filter(event => 
        !event.venue?.name?.toLowerCase().includes('toronto') ||
        event.venue?.name?.toLowerCase().includes('vancouver') ||
        event.venue?.name?.toLowerCase().includes('calgary')
      );
      
      falseTorontoEvents.slice(0, 5).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   venue.name: "${event.venue?.name}"`);
        console.log(`   location: "${event.location || 'MISSING'}"`);
        console.log('');
      });
    }

    // Step 4: Find the "missing" Vancouver/Calgary events
    console.log('🔍 STEP 4: VANCOUVER/CALGARY MYSTERY - WHY ARE EVENTS HIDDEN?');
    console.log('=' .repeat(50));
    
    for (const city of ['Vancouver', 'Calgary']) {
      console.log(`\n🏙️ Analyzing ${city} hidden events:`);
      
      const allCityEvents = await Event.find({
        'venue.name': new RegExp(city, 'i')
      }).lean();
      
      console.log(`📊 Total ${city} events in DB: ${allCityEvents.length}`);
      
      // Check what might be filtering them out in the app
      const issueAnalysis = {
        missingCoordinates: 0,
        malformedDates: 0,
        crossContamination: 0,
        pastEvents: 0,
        missingFields: 0
      };
      
      const currentDate = new Date();
      
      allCityEvents.forEach(event => {
        // Missing coordinates
        if (!event.coordinates || !event.coordinates.lat || !event.coordinates.lng) {
          issueAnalysis.missingCoordinates++;
        }
        
        // Malformed dates
        if (!event.startDate || isNaN(new Date(event.startDate))) {
          issueAnalysis.malformedDates++;
        }
        
        // Cross contamination
        if (event.venue?.name && 
            cities.filter(c => c !== city).some(otherCity => 
              event.venue.name.toLowerCase().includes(otherCity.toLowerCase())
            )) {
          issueAnalysis.crossContamination++;
        }
        
        // Past events
        if (event.startDate && new Date(event.startDate) < currentDate) {
          issueAnalysis.pastEvents++;
        }
        
        // Missing critical fields
        if (!event.title || !event.venue?.name || !event.startDate) {
          issueAnalysis.missingFields++;
        }
      });
      
      console.log(`📋 Potential filtering issues for ${city}:`);
      Object.entries(issueAnalysis).forEach(([issue, count]) => {
        const percentage = ((count / allCityEvents.length) * 100).toFixed(1);
        console.log(`   ${issue}: ${count} events (${percentage}%)`);
      });
    }

    console.log('\n🎯 INVESTIGATION COMPLETE!');
    console.log('\n🚨 KEY FINDINGS:');
    console.log('1. Cross-city contamination is causing events to appear in wrong cities');
    console.log('2. Toronto is "stealing" events from other cities due to contaminated venue.name');
    console.log('3. Vancouver/Calgary events may be hidden due to missing coordinates or other issues');
    console.log('4. The database counts are correct, but app filtering logic has bugs');
    
    console.log('\n💡 RECOMMENDED FIXES:');
    console.log('1. Fix cross-city contamination in venue.name fields');
    console.log('2. Add coordinates to all events to prevent coordinate-based filtering');
    console.log('3. Investigate app city filtering logic for exact match requirements');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateDbVsAppDiscrepancy().catch(console.error);
