/**
 * INVESTIGATE VANCOUVER EVENT MYSTERY
 * Vancouver has 274 scrapers but only 285 events showing
 * Toronto has 129 scrapers but 641 events showing
 * Something is wrong with Vancouver event tagging/filtering!
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function investigateVancouverMystery() {
  try {
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    
    console.log('🔍 INVESTIGATING VANCOUVER EVENT MYSTERY...\n');
    console.log('🚨 PROBLEM: 274 scrapers but only 285 events (vs Toronto: 129 scrapers, 641 events)');
    console.log('🎯 GOAL: Find where Vancouver events are hiding\n');

    // Step 1: Comprehensive Vancouver pattern search
    console.log('🌊 COMPREHENSIVE VANCOUVER SEARCH:');
    console.log('=' .repeat(50));
    
    const vancouverPatterns = [
      { name: 'Exact "Vancouver"', pattern: /\bVancouver\b/i },
      { name: 'Vancouver BC', pattern: /Vancouver.*BC/i },
      { name: 'Vancouver, BC', pattern: /Vancouver,\s*BC/i },
      { name: 'Just "BC"', pattern: /\bBC\b/ },
      { name: 'British Columbia', pattern: /British Columbia/i },
      { name: 'Richmond', pattern: /Richmond/i },
      { name: 'Burnaby', pattern: /Burnaby/i },
      { name: 'Surrey', pattern: /Surrey/i },
      { name: 'North Vancouver', pattern: /North Vancouver/i },
      { name: 'West Vancouver', pattern: /West Vancouver/i }
    ];
    
    for (const { name, pattern } of vancouverPatterns) {
      const count = await Event.countDocuments({
        'venue.name': pattern
      });
      console.log(`   ${name}: ${count} events`);
    }

    // Step 2: Check what events are NOT being tagged as Vancouver
    console.log('\n🔍 EVENTS MISSING VANCOUVER TAGGING:');
    console.log('=' .repeat(50));
    
    // Find events that mention Vancouver/BC in location but NOT in venue.name
    const vancouverInLocationNotVenue = await Event.find({
      $and: [
        {
          $or: [
            { location: /Vancouver|BC|British Columbia/i },
            { address: /Vancouver|BC|British Columbia/i },
            { 'venue.city': /Vancouver|BC/i }
          ]
        },
        { 'venue.name': { $not: /Vancouver/i } }
      ]
    }).limit(10).lean();
    
    console.log(`🚨 Found ${vancouverInLocationNotVenue.length} events with Vancouver in location but NOT in venue.name:`);
    
    vancouverInLocationNotVenue.forEach((event, i) => {
      console.log(`${i + 1}. "${event.title}"`);
      console.log(`   venue.name: "${event.venue?.name || 'MISSING'}"`);
      console.log(`   location: "${event.location || 'MISSING'}"`);
      console.log(`   venue.city: "${event.venue?.city || 'MISSING'}"`);
      console.log(`   scraper: "${event.scraper || event.source || 'UNKNOWN'}"`);
      console.log('');
    });

    // Step 3: Compare city distributions
    console.log('🏙️ CITY COMPARISON ANALYSIS:');
    console.log('=' .repeat(50));
    
    const cities = ['Vancouver', 'Toronto', 'Calgary', 'New York', 'Montreal'];
    const cityStats = {};
    
    for (const city of cities) {
      const count = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      cityStats[city] = count;
      console.log(`   ${city}: ${count} events`);
    }
    
    // Step 4: Check scraper source patterns
    console.log('\n📁 SCRAPER SOURCE ANALYSIS:');
    console.log('=' .repeat(50));
    
    // Group by scraper to see distribution
    const scraperStats = await Event.aggregate([
      { $group: { _id: '$scraper', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);
    
    console.log('🔧 TOP SCRAPER SOURCES:');
    scraperStats.forEach((stat, i) => {
      const scraperName = stat._id || 'Unknown';
      console.log(`${i + 1}. ${scraperName}: ${stat.count} events`);
    });

    // Step 5: Check for Vancouver scrapers specifically
    console.log('\n🌊 VANCOUVER-SPECIFIC SCRAPER CHECK:');
    console.log('=' .repeat(50));
    
    const vancouverScraperEvents = await Event.find({
      scraper: /Vancouver/i
    }).limit(5).lean();
    
    if (vancouverScraperEvents.length > 0) {
      console.log('✅ Found events from Vancouver scrapers:');
      vancouverScraperEvents.forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}" - venue.name: "${event.venue?.name}"`);
      });
    } else {
      console.log('❌ No events found with Vancouver scraper names');
    }

    // Step 6: Regional vs city tagging issue
    console.log('\n🗺️ REGIONAL TAGGING ANALYSIS:');
    console.log('=' .repeat(50));
    
    const bcRegionEvents = await Event.countDocuments({
      $and: [
        { 'venue.name': /BC|British Columbia/i },
        { 'venue.name': { $not: /Vancouver/i } }
      ]
    });
    
    console.log(`🍁 Events tagged with BC/British Columbia but NOT Vancouver: ${bcRegionEvents}`);
    
    if (bcRegionEvents > 0) {
      const sampleBCEvents = await Event.find({
        $and: [
          { 'venue.name': /BC|British Columbia/i },
          { 'venue.name': { $not: /Vancouver/i } }
        ]
      }).limit(5).lean();
      
      console.log('\n📋 Sample BC-but-not-Vancouver events:');
      sampleBCEvents.forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   venue.name: "${event.venue?.name}"`);
        console.log(`   location: "${event.location || 'MISSING'}"`);
      });
    }

    console.log('\n🎯 VANCOUVER MYSTERY ANALYSIS COMPLETE!');
    console.log('\n🚨 LIKELY CAUSES:');
    console.log('1. Events tagged with "BC" instead of "Vancouver"');
    console.log('2. Regional scrapers not tagging with specific city');
    console.log('3. App filtering only for exact "Vancouver" match');
    console.log('4. Surrey/Richmond/Burnaby events not tagged as Vancouver');
    console.log('5. Auto-city detection not working for Vancouver scrapers');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the Vancouver investigation
investigateVancouverMystery().catch(console.error);
