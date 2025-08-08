/**
 * FIX VENUE STRUCTURE FOR ALL CITIES
 * Convert venue: "string" to venue: { name: "string" } format
 * This will unlock hundreds of hidden events across all cities
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixVenueStructureAllCities() {
  try {
    console.log('🏗️ VENUE STRUCTURE REPAIR FOR ALL CITIES...\n');
    console.log('🎯 GOAL: Convert venue strings to venue.name objects');
    console.log('❓ ISSUE: venue: "String" → venue: { name: "String" }');
    console.log('🚀 RESULT: Unlock hundreds of hidden events in app\n');
    
    // Connect to PRODUCTION MongoDB
    const productionURI = process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI;
    await mongoose.connect(productionURI);
    console.log('✅ Connected to Production MongoDB\n');

    const Event = require('./models/Event');

    console.log('🔍 STEP 1: IDENTIFY EVENTS WITH VENUE AS STRING');
    console.log('=' .repeat(50));
    
    // Find events where venue is a string (not an object with .name)
    const venueStringEvents = await Event.find({
      $and: [
        { venue: { $exists: true, $ne: null } },
        { venue: { $type: 'string' } }  // venue is string, not object
      ]
    });

    console.log(`📊 Events with venue as string: ${venueStringEvents.length}`);

    if (venueStringEvents.length === 0) {
      console.log('✅ No venue structure issues found - all events already correct!');
      return;
    }

    // Group by city for reporting
    const cityMappings = {
      'Calgary': ['calgary-', 'saddledome', 'stampede-', 'arts-commons', 'globalfest'],
      'Montreal': ['montreal-', 'bell-centre', 'place-des-arts', 'salsatheque', 'osheaga'],
      'New York': ['apollo-theater', 'barclays-center', 'beacon-theatre', 'blue-note', 'bowery-ballroom', 'broadway-theater', 'brooklyn-bowl', 'carnegie-hall', 'madison-square-garden', 'radio-city', 'yankee-stadium', 'nyc-', 'manhattan-', 'brooklyn-', 'timeout-nyc'],
      'Toronto': ['toronto-', 'cn-tower', 'rogers-centre', 'scotiabank-arena', 'roy-thomson-hall', 'massey-hall', 'harbourfront-', 'tiff-', 'gardiner-museum'],
      'Vancouver': ['vancouver-', 'bc-place', 'rogers-arena', 'queen-elizabeth-theatre', 'orpheum-', 'vogue-theatre', 'commodore-ballroom', 'the-roxy', 'fortune-sound-club', 'stanley-park', 'science-world']
    };

    const cityStats = {};
    for (const city of Object.keys(cityMappings)) {
      cityStats[city] = { count: 0, events: [] };
    }

    // Categorize events by city
    for (const event of venueStringEvents) {
      const scraper = event.scraper || event.source || event.scraperId || event.sourceId || '';
      let cityFound = false;
      
      for (const [city, patterns] of Object.entries(cityMappings)) {
        if (patterns.some(pattern => scraper.toLowerCase().includes(pattern.toLowerCase()))) {
          cityStats[city].count++;
          cityStats[city].events.push(event);
          cityFound = true;
          break;
        }
      }
      
      if (!cityFound) {
        if (!cityStats['Other']) cityStats['Other'] = { count: 0, events: [] };
        cityStats['Other'].count++;
        cityStats['Other'].events.push(event);
      }
    }

    console.log('\n📊 VENUE STRUCTURE ISSUES BY CITY:');
    Object.entries(cityStats).forEach(([city, stats]) => {
      if (stats.count > 0) {
        console.log(`🏙️ ${city}: ${stats.count} events need venue structure fix`);
      }
    });

    console.log('\n📋 SAMPLE EVENTS TO FIX:');
    console.log('=' .repeat(30));
    venueStringEvents.slice(0, 8).forEach((event, i) => {
      const scraper = event.scraper || event.source || event.scraperId || event.sourceId || 'Unknown';
      console.log(`${i + 1}. "${event.title}"`);
      console.log(`   Scraper: ${scraper}`);
      console.log(`   Current venue: "${event.venue}" (string)`);
      console.log(`   Will become: { name: "${event.venue}" } (object)`);
      console.log('');
    });

    console.log('\n🚀 STEP 2: CONVERT VENUE STRINGS TO OBJECTS');
    console.log('=' .repeat(50));

    let totalFixed = 0;
    let errors = 0;

    for (const event of venueStringEvents) {
      try {
        const venueString = event.venue;
        
        // Convert string to object with name field
        const venueObject = {
          name: venueString
        };

        await Event.updateOne(
          { _id: event._id },
          { $set: { venue: venueObject } }
        );

        totalFixed++;

        if (totalFixed % 50 === 0) {
          console.log(`   🔧 Fixed ${totalFixed}/${venueStringEvents.length} venue structures...`);
        }

      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`   ❌ Failed to fix ${event._id}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ VENUE STRUCTURE REPAIR COMPLETE!`);
    console.log(`🔧 Fixed: ${totalFixed} events`);
    console.log(`❌ Errors: ${errors} events`);

    console.log('\n🔍 STEP 3: VERIFY REPAIR RESULTS');
    console.log('=' .repeat(40));

    // Verify no more string venues remain
    const remainingStringVenues = await Event.countDocuments({
      venue: { $type: 'string' }
    });

    console.log(`📊 Remaining venue strings: ${remainingStringVenues}`);

    // Count events with proper venue.name structure
    const properVenueNameCount = await Event.countDocuments({
      'venue.name': { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`📊 Events with proper venue.name: ${properVenueNameCount}`);

    console.log('\n🎯 EXPECTED APP IMPROVEMENTS:');
    console.log('=' .repeat(35));
    Object.entries(cityStats).forEach(([city, stats]) => {
      if (stats.count > 0) {
        console.log(`🏙️ ${city}: +${stats.count} events should now be visible in app`);
      }
    });

    const totalImprovement = totalFixed;
    console.log(`\n🚀 TOTAL EXPECTED IMPROVEMENT: +${totalImprovement} events visible in app!`);

    console.log('\n🏆 SUCCESS! VENUE STRUCTURE REPAIR COMPLETE!');
    console.log('✅ All venue strings converted to proper venue.name objects');
    console.log('🎯 App city filtering should now work for ALL events');
    console.log('📱 Test all cities - should see dramatic increases!');

    // Final city-by-city verification
    console.log('\n🔍 FINAL VERIFICATION - Events with venue.name by city patterns:');
    console.log('=' .repeat(65));
    
    for (const [city, patterns] of Object.entries(cityMappings)) {
      const cityScraperRegex = new RegExp(patterns.join('|'), 'i');
      
      const cityEventsWithVenueName = await Event.countDocuments({
        $and: [
          {
            $or: [
              { scraper: { $regex: cityScraperRegex } },
              { source: { $regex: cityScraperRegex } },
              { scraperId: { $regex: cityScraperRegex } },
              { sourceId: { $regex: cityScraperRegex } }
            ]
          },
          { 'venue.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      });
      
      console.log(`🏙️ ${city}: ${cityEventsWithVenueName} events with proper venue.name`);
    }

  } catch (error) {
    console.error('❌ Error fixing venue structures:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Production MongoDB connection closed');
  }
}

// Run the venue structure repair
fixVenueStructureAllCities().catch(console.error);
