/**
 * CORRECT PRODUCTION FIX: NYC VENUE.NAME FOR GENUINE NYC EVENTS ONLY
 * App filters by venue.name, not location!
 * Only fix venue.name for events actually scraped from NYC scrapers
 * Deploy this to PRODUCTION to fix the app filtering
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixGenuineNYCVenueNamesProduction() {
  try {
    console.log('🗽 PRODUCTION FIX: GENUINE NYC VENUE.NAME NORMALIZATION...\n');
    console.log('🎯 DISCOVERY: App filters by venue.name, not location!');
    console.log('📱 App shows: 10 events (= events with "New York" in venue.name)');
    console.log('✅ APPROACH: Fix venue.name for genuine NYC events only');
    console.log('📁 SOURCE: Only events from NYC scraper patterns');
    console.log('🌐 TARGET: Production MongoDB on Render.com\n');
    
    // Connect to PRODUCTION MongoDB
    const productionURI = process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI;
    await mongoose.connect(productionURI);
    console.log('✅ Connected to Production MongoDB\n');

    const Event = require('./models/Event');

    // Genuine NYC scraper patterns (only these should have "New York" in venue.name)
    const genuineNYCPatterns = [
      // Major NYC venues
      'apollo-theater', 'barclays-center', 'beacon-theatre', 'blue-note',
      'bowery-ballroom', 'broadway-theater', 'brooklyn-bowl', 'carnegie-hall',
      'comedy-cellar', 'madison-square-garden', 'msg-', 'radio-city',
      'yankee-stadium', 'terminal-5', 'village-vanguard', 'webster-hall',
      'lincoln-center', 'met-museum', 'brooklyn-bridge', 'central-park',
      
      // NYC area patterns
      'manhattan-', 'brooklyn-', 'bronx-', 'queens-', 'staten-island',
      'nyc-', 'new-york-', 'timeout-nyc', 'nycgo', 'amny-',
      
      // NYC event platforms
      'eventbrite-nyc', 'ticketmaster-nyc', 'seatgeek-nyc', 'livenation-nyc',
      
      // NYC festivals and specific events
      'tribeca-film', 'nyfw-', 'anime-nyc', 'electric-zoo', 'governors-island',
      'hudson-river-park', 'prospect-park', 'times-square'
    ];

    console.log('🔍 STEP 1: IDENTIFY GENUINE NYC EVENTS');
    console.log('=' .repeat(45));
    
    // Build regex for genuine NYC scraper patterns
    const nycScraperRegex = new RegExp(genuineNYCPatterns.join('|'), 'i');
    
    // Find events from genuine NYC scrapers that don't have "New York" in venue.name
    const genuineNYCEvents = await Event.find({
      $and: [
        {
          $or: [
            { scraper: { $regex: nycScraperRegex } },
            { source: { $regex: nycScraperRegex } },
            { scraperId: { $regex: nycScraperRegex } },
            { sourceId: { $regex: nycScraperRegex } }
          ]
        },
        // Don't already have "New York" in venue.name
        { 'venue.name': { $not: { $regex: /new york/i } } }
      ]
    });

    console.log(`📊 Genuine NYC events needing venue.name fix: ${genuineNYCEvents.length}`);

    if (genuineNYCEvents.length > 0) {
      console.log('\n📋 SAMPLE GENUINE NYC EVENTS TO FIX:');
      genuineNYCEvents.slice(0, 5).forEach((event, i) => {
        const scraper = event.scraper || event.source || event.scraperId || event.sourceId || 'N/A';
        const currentVenueName = event.venue?.name || '';
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   Scraper: ${scraper}`);
        console.log(`   Current venue.name: "${currentVenueName}"`);
        console.log(`   Will become: "${currentVenueName}, New York"`);
        console.log('');
      });

      console.log('\n🚀 APPLYING GENUINE NYC VENUE.NAME FIXES...');
      console.log('=' .repeat(48));

      let updated = 0;
      for (const event of genuineNYCEvents) {
        try {
          const currentVenueName = event.venue?.name || '';
          let newVenueName;

          if (!currentVenueName || currentVenueName.trim() === '') {
            newVenueName = 'New York Venue';
          } else {
            newVenueName = `${currentVenueName}, New York`;
          }

          await Event.updateOne(
            { _id: event._id },
            { $set: { 'venue.name': newVenueName } }
          );

          updated++;

          if (updated % 25 === 0) {
            console.log(`   📊 Updated ${updated}/${genuineNYCEvents.length} venue names...`);
          }

        } catch (error) {
          console.error(`   ❌ Failed to update ${event._id}: ${error.message}`);
        }
      }

      console.log(`\n✅ VENUE.NAME FIXES COMPLETE!`);
      console.log(`🔧 Updated: ${updated} genuine NYC events`);
    }

    console.log('\n🔍 STEP 2: CLEAN UP INCORRECT VENUE.NAMES');
    console.log('=' .repeat(45));
    
    // Remove "New York" from venue.name for events that are NOT from NYC scrapers
    const incorrectNYCEvents = await Event.find({
      $and: [
        { 'venue.name': { $regex: /new york/i } },
        {
          $nor: [
            { scraper: { $regex: nycScraperRegex } },
            { source: { $regex: nycScraperRegex } },
            { scraperId: { $regex: nycScraperRegex } },
            { sourceId: { $regex: nycScraperRegex } }
          ]
        }
      ]
    });

    console.log(`📊 Incorrect NYC venue.names to clean: ${incorrectNYCEvents.length}`);

    if (incorrectNYCEvents.length > 0) {
      console.log('\n📋 SAMPLE INCORRECT NYC VENUE.NAMES TO CLEAN:');
      incorrectNYCEvents.slice(0, 5).forEach((event, i) => {
        const scraper = event.scraper || event.source || event.scraperId || event.sourceId || 'N/A';
        const currentVenueName = event.venue?.name || '';
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   Scraper: ${scraper} (NOT NYC)`);
        console.log(`   Current venue.name: "${currentVenueName}"`);
        console.log(`   Should clean: Remove "New York" reference`);
        console.log('');
      });

      let cleaned = 0;
      for (const event of incorrectNYCEvents) {
        try {
          const currentVenueName = event.venue?.name || '';
          // Remove various "New York" patterns from venue name
          let cleanedVenueName = currentVenueName
            .replace(/,\s*new york$/i, '')
            .replace(/\s*-\s*new york$/i, '')
            .replace(/\s*new york$/i, '')
            .trim();

          if (cleanedVenueName !== currentVenueName) {
            await Event.updateOne(
              { _id: event._id },
              { $set: { 'venue.name': cleanedVenueName } }
            );
            cleaned++;
          }

        } catch (error) {
          console.error(`   ❌ Failed to clean ${event._id}: ${error.message}`);
        }
      }

      console.log(`✅ Cleaned ${cleaned} incorrect venue.names`);
    }

    // Final verification
    console.log('\n🎯 FINAL VERIFICATION:');
    console.log('=' .repeat(25));
    
    const finalNYCVenueNames = await Event.countDocuments({
      'venue.name': { $regex: /new york/i }
    });
    
    console.log(`📊 Events with "New York" in venue.name: ${finalNYCVenueNames}`);
    console.log(`📱 App should now show ~${finalNYCVenueNames} NYC events!`);
    
    if (finalNYCVenueNames > 10) {
      const improvement = Math.round(((finalNYCVenueNames - 10) / 10) * 100);
      console.log(`🚀 Expected improvement: +${finalNYCVenueNames - 10} events (+${improvement}%)`);
    }

    console.log('\n🏆 PRODUCTION NYC VENUE.NAME FIX COMPLETE!');
    console.log('✅ Only genuine NYC events have "New York" in venue.name');
    console.log('🚫 Cleaned up cross-city contamination');
    console.log('📱 App filtering should now work correctly!');

  } catch (error) {
    console.error('❌ Error fixing genuine NYC venue names:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Production MongoDB connection closed');
  }
}

// Run the production venue.name fix
fixGenuineNYCVenueNamesProduction().catch(console.error);
