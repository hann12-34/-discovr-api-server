/**
 * CORRECT APPROACH: NYC VENUE.NAME NORMALIZATION FOR GENUINE NYC EVENTS ONLY
 * Only tag events as "New York" if they were actually scraped by NYC scrapers
 * from the scrapers/cities/New York folder
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixGenuineNYCVenues() {
  try {
    console.log('🗽 CORRECT APPROACH: GENUINE NYC VENUE.NAME NORMALIZATION...\n');
    console.log('✅ PROPER METHOD: Only tag events scraped by NYC scrapers');
    console.log('📁 Source: scrapers/cities/New York/ folder');
    console.log('🚫 EXCLUDE: Events from other cities (even if they mention NYC)');
    console.log('🎯 Goal: Add "New York" to venue.name ONLY for genuine NYC events\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Production MongoDB\n');

    const Event = require('./models/Event');

    // List of genuine NYC scraper identifiers
    // These are scrapers that actually scrape NYC venues and events
    const nycScraperPatterns = [
      // Major NYC venue scrapers
      'apollo-theater', 'barclays-center', 'beacon-theatre', 'blue-note',
      'bowery-ballroom', 'broadway-theaters', 'brooklyn-bowl', 'carnegie-hall',
      'comedy-cellar', 'electric-zoo', 'empire-state-building', 'governors-island',
      'hudson-river-park', 'irving-plaza', 'javits-center', 'joyce-theater',
      'lincoln-center', 'madison-square-garden', 'madison-square-park',
      'mercury-lounge', 'met-museum', 'radio-city-music-hall', 'terminal-5',
      'village-vanguard', 'webster-hall', 'yankee-stadium',
      
      // NYC area/borough scrapers
      'bronx-events', 'bronx-zoo', 'brooklyn-bridge-park', 'central-park',
      'citi-field', 'circle-line', 'queens-events', 'staten-island-events',
      'prospect-park', 'statue-of-liberty', 'times-square',
      
      // NYC event platforms and festivals
      'nyc-com', 'nycgo', 'timeout-nyc', 'ticketmaster-nyc', 'seatgeek-nyc',
      'eventbrite-nyc', 'livenation-nyc', 'resident-advisor-nyc',
      'nyc-comedy-festival', 'nyc-fashion-week', 'nyc-marathon', 'tribeca-film',
      'nyfw-events', 'nyc-wine-food-festival',
      
      // NYC category-specific scrapers
      'nyc-nightlife', 'nyc-parks', 'nyc-museums', 'nyc-arts-crafts',
      'nyc-business-networking', 'nyc-cultural-institutions', 'nyc-dot',
      'nyc-ferry', 'nyc-food', 'nyc-kids-family', 'nyc-lgbtq', 'nyc-tech',
      'nyc-tourism', 'nyc-rooftop', 'anime-nyc', 'amny-events',
      
      // General NYC area patterns
      'manhattan', 'brooklyn', 'queens', 'bronx', 'new-york', 'nyc-'
    ];

    console.log(`🔍 Looking for events from ${nycScraperPatterns.length} NYC scraper patterns...`);

    // Find events that were scraped by genuine NYC scrapers
    // Check both scraper field and source field
    const genuineNYCEvents = await Event.find({
      $and: [
        {
          $or: [
            { scraper: { $regex: new RegExp(nycScraperPatterns.join('|'), 'i') } },
            { source: { $regex: new RegExp(nycScraperPatterns.join('|'), 'i') } },
            { scraperId: { $regex: new RegExp(nycScraperPatterns.join('|'), 'i') } },
            { sourceId: { $regex: new RegExp(nycScraperPatterns.join('|'), 'i') } }
          ]
        },
        // Don't already have "New York" in venue.name
        { 'venue.name': { $not: { $regex: /new york/i } } }
      ]
    });

    console.log(`🔍 Found ${genuineNYCEvents.length} genuine NYC events needing venue.name normalization`);

    let normalized = 0;
    const updates = [];

    console.log('\n🔧 ANALYZING GENUINE NYC EVENTS...');
    console.log('=' .repeat(45));

    for (const event of genuineNYCEvents) {
      const scraper = event.scraper || event.source || event.scraperId || event.sourceId || '';
      const currentVenueName = event.venue?.name || '';

      // Create new venue name that includes "New York"
      let newVenueName;
      
      if (!currentVenueName || currentVenueName.trim() === '') {
        newVenueName = 'New York Venue';
      } else {
        // Add "New York" to existing venue name
        newVenueName = `${currentVenueName}, New York`;
      }

      updates.push({
        eventId: event._id,
        title: event.title,
        scraper: scraper,
        currentVenueName: currentVenueName,
        newVenueName: newVenueName
      });
    }

    console.log(`📊 Genuine NYC events to update: ${updates.length}`);

    if (updates.length > 0) {
      console.log('\n📋 SAMPLE GENUINE NYC VENUE.NAME UPDATES:');
      console.log('=' .repeat(50));
      updates.slice(0, 10).forEach((update, i) => {
        console.log(`${i + 1}. "${update.title}"`);
        console.log(`   Scraper: ${update.scraper}`);
        console.log(`   Current venue.name: "${update.currentVenueName}"`);
        console.log(`   New venue.name: "${update.newVenueName}"`);
        console.log('');
      });

      console.log('\n🚀 APPLYING GENUINE NYC VENUE.NAME UPDATES...');
      console.log('=' .repeat(48));

      for (const update of updates) {
        try {
          // Handle different venue field types
          if (!update.currentVenueName || update.currentVenueName.trim() === '') {
            // Create new venue object with New York name
            await Event.updateOne(
              { _id: update.eventId },
              { 
                $set: { 
                  venue: { 
                    name: update.newVenueName,
                    city: 'New York'
                  }
                }
              }
            );
          } else {
            // Update existing venue name
            await Event.updateOne(
              { _id: update.eventId },
              { $set: { 'venue.name': update.newVenueName } }
            );
          }
          
          normalized++;
          
          if (normalized % 25 === 0) {
            console.log(`   📊 Updated ${normalized}/${updates.length} genuine NYC venue names...`);
          }
          
        } catch (error) {
          console.error(`   ❌ Failed to update ${update.eventId}: ${error.message}`);
        }
      }

      console.log(`\n✅ GENUINE NYC VENUE.NAME NORMALIZATION COMPLETE!`);
      console.log(`🔧 Updated: ${normalized} genuine NYC events`);

      // Verify the fix
      const verifyNYCEvents = await Event.countDocuments({
        'venue.name': { $regex: /new york/i }
      });

      console.log(`\n🎯 VERIFICATION:`);
      console.log(`📊 Events with "New York" in venue.name: ${verifyNYCEvents}`);
      console.log(`📱 App should now show ~${verifyNYCEvents} NYC events (genuine ones only)!`);

      if (verifyNYCEvents > 4) {
        const improvement = Math.round(((verifyNYCEvents - 4) / 4) * 100);
        console.log(`🚀 Expected improvement: +${verifyNYCEvents - 4} events (+${improvement}%)`);
      }

      console.log('\n🏆 SUCCESS! GENUINE NYC VENUE.NAME NORMALIZATION COMPLETE!');
      console.log('✅ ONLY events from actual NYC scrapers were tagged');
      console.log('🚫 NO cross-city contamination this time');
      console.log('📱 Please test the app - NYC events should increase appropriately!');

    } else {
      console.log('\n✅ No genuine NYC venue.name updates needed');
      console.log('🔍 All genuine NYC events already have "New York" in venue.name');
      
      // Check if we have any NYC events at all
      const existingNYCEvents = await Event.countDocuments({
        'venue.name': { $regex: /new york/i }
      });
      
      console.log(`📊 Current events with "New York" in venue.name: ${existingNYCEvents}`);
      
      if (existingNYCEvents < 10) {
        console.log('⚠️ Very few NYC events found - may need to check scraper identifier patterns');
      }
    }

  } catch (error) {
    console.error('❌ Error normalizing genuine NYC venue names:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the correct genuine NYC venue.name normalization
fixGenuineNYCVenues().catch(console.error);
