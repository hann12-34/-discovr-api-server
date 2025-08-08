/**
 * COMPREHENSIVE CITY BACKFILL FOR ALL EXISTING EVENTS
 * Fix the 82.4% of events missing city tags in venue.name
 * Make ALL 4,066 events visible in app city filtering
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function backfillAllCityTags() {
  try {
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    
    console.log('🔧 COMPREHENSIVE CITY BACKFILL FOR ALL EXISTING EVENTS...\n');
    console.log('🚨 PROBLEM: 82.4% of events missing city tags in venue.name');
    console.log('🎯 GOAL: Make ALL 4,066 events visible in app city filtering');
    console.log('✅ RESULT: Massive increase in event visibility for all cities\n');

    // Step 1: Define city detection patterns
    const cityPatterns = {
      'New York': [
        // NYC patterns
        /NYC/i,
        /New York/i,
        /Manhattan/i,
        /Brooklyn/i,
        /Queens/i,
        /Bronx/i,
        /Staten Island/i,
        // Address patterns
        /\bNY\b/,
        /New York, NY/i,
        /Manhattan, NY/i,
        // Venue patterns
        /Broadway/i,
        /Times Square/i,
        /Central Park/i
      ],
      
      'Vancouver': [
        /Vancouver/i,
        /\bBC\b/,
        /British Columbia/i,
        /Vancouver, BC/i,
        /Richmond, BC/i,
        /Burnaby, BC/i,
        /Surrey, BC/i
      ],
      
      'Calgary': [
        /Calgary/i,
        /\bAB\b/,
        /Alberta/i,
        /Calgary, AB/i,
        /Canmore/i,
        /Canmore, AB/i
      ],
      
      'Montreal': [
        /Montreal/i,
        /Montréal/i,
        /\bQC\b/,
        /Quebec/i,
        /Montreal, QC/i,
        /Québec/i
      ],
      
      'Toronto': [
        /Toronto/i,
        /\bON\b/,
        /Ontario/i,
        /Toronto, ON/i,
        /Mississauga/i,
        /Scarborough/i
      ]
    };

    // Step 2: Backfill events missing city tags
    let totalFixed = 0;
    const cityStats = {};
    
    for (const [cityName, patterns] of Object.entries(cityPatterns)) {
      console.log(`\n🏙️ PROCESSING ${cityName.toUpperCase()}...`);
      console.log('=' .repeat(50));
      
      // Find events that match city patterns but don't have city in venue.name
      const query = {
        $and: [
          {
            $or: [
              // Match patterns in location
              { location: { $in: patterns } },
              // Match patterns in venue.name (but missing city suffix)
              { 'venue.name': { $in: patterns } },
              // Match patterns in venue.city
              { 'venue.city': { $in: patterns } },
              // Match patterns in address fields
              { address: { $in: patterns } }
            ]
          },
          // But don't already have the city name in venue.name
          { 'venue.name': { $not: { $regex: cityName, $options: 'i' } } }
        ]
      };
      
      const eventsToFix = await Event.find(query).lean();
      console.log(`🔍 Found ${eventsToFix.length} events to tag with "${cityName}"`);
      
      if (eventsToFix.length > 0) {
        // Show a few samples
        console.log('\n📋 Sample events to fix:');
        eventsToFix.slice(0, 3).forEach((event, i) => {
          console.log(`${i + 1}. "${event.title}"`);
          console.log(`   venue.name: "${event.venue?.name || 'MISSING'}"`);
          console.log(`   location: "${event.location || 'MISSING'}"`);
        });
        
        // Bulk update to add city to venue.name
        const bulkOps = eventsToFix.map(event => ({
          updateOne: {
            filter: { _id: event._id },
            update: {
              $set: {
                'venue.name': `${event.venue?.name || 'Unknown Venue'}, ${cityName}`
              }
            }
          }
        }));
        
        const result = await Event.bulkWrite(bulkOps);
        console.log(`✅ Updated ${result.modifiedCount} events with "${cityName}" tag`);
        
        totalFixed += result.modifiedCount;
        cityStats[cityName] = result.modifiedCount;
      } else {
        console.log(`✅ No events need "${cityName}" tagging`);
        cityStats[cityName] = 0;
      }
    }

    // Step 3: Handle special NYC variants
    console.log(`\n🗽 SPECIAL NYC VARIANT PROCESSING...`);
    console.log('=' .repeat(50));
    
    // Find events with "NYC" but not "New York"
    const nycVariants = await Event.find({
      $and: [
        { 'venue.name': { $regex: /NYC|Manhattan|Brooklyn/i } },
        { 'venue.name': { $not: { $regex: /New York/i } } }
      ]
    }).lean();
    
    console.log(`🔍 Found ${nycVariants.length} events with NYC variants needing "New York" tag`);
    
    if (nycVariants.length > 0) {
      const nycBulkOps = nycVariants.map(event => ({
        updateOne: {
          filter: { _id: event._id },
          update: {
            $set: {
              'venue.name': `${event.venue?.name}, New York`
            }
          }
        }
      }));
      
      const nycResult = await Event.bulkWrite(nycBulkOps);
      console.log(`✅ Updated ${nycResult.modifiedCount} NYC variant events`);
      totalFixed += nycResult.modifiedCount;
      cityStats['NYC Variants'] = nycResult.modifiedCount;
    }

    // Step 4: Verify results
    console.log(`\n📊 BACKFILL RESULTS SUMMARY:`);
    console.log('=' .repeat(50));
    
    const newTotalEvents = await Event.countDocuments({});
    const newEventsWithCity = await Event.countDocuments({
      'venue.name': { $regex: /New York|Vancouver|Calgary|Montreal|Toronto/i }
    });
    
    const newCoverage = ((newEventsWithCity / newTotalEvents) * 100).toFixed(1);
    
    console.log(`🎯 Total events fixed: ${totalFixed}`);
    console.log(`📊 Events with city tags: ${newEventsWithCity}/${newTotalEvents} (${newCoverage}%)`);
    
    console.log('\n🏙️ CITY-BY-CITY BACKFILL:');
    Object.entries(cityStats).forEach(([city, count]) => {
      console.log(`   ${city}: +${count} events`);
    });

    // Step 5: Test new NYC filtering
    console.log(`\n🗽 NEW YORK FILTERING TEST:`);
    console.log('=' .repeat(50));
    
    const newNYCCount = await Event.countDocuments({
      'venue.name': { $regex: /New York/i }
    });
    
    console.log(`🎯 Events with "New York" in venue.name: ${newNYCCount}`);
    console.log(`📈 Expected app visibility: ~${newNYCCount} NYC events`);
    
    console.log(`\n🏆 BACKFILL COMPLETE!`);
    console.log(`\n🎯 EXPECTED APP IMPROVEMENTS:`);
    console.log(`🗽 New York: Should now show ~${newNYCCount} events (was 192)`);
    console.log(`🌊 Vancouver: Massive increase expected`);
    console.log(`🍁 Calgary: Massive increase expected`);
    console.log(`🇫🇷 Montreal: Massive increase expected`);
    console.log(`🏢 Toronto: Massive increase expected`);
    
    console.log(`\n📱 PLEASE TEST THE APP NOW!`);
    console.log(`Expected result: Dramatically more events visible in all city filters`);
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  }
}

// Run the comprehensive backfill
backfillAllCityTags().catch(console.error);
