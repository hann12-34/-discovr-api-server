/**
 * COMPREHENSIVE SCRAPER VENUE.NAME AUDIT
 * Find all scrapers that are not populating venue.name properly
 * This is causing events to be invisible after city filtering
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function auditScraperVenueNames() {
  try {
    console.log('🔍 COMPREHENSIVE SCRAPER VENUE.NAME AUDIT...\n');
    console.log('🎯 GOAL: Find scrapers not populating venue.name properly');
    console.log('❓ ISSUE: Events without venue.name are invisible to app filtering');
    console.log('🔧 SOLUTION: Identify and fix problematic scrapers\n');
    
    // Connect to PRODUCTION MongoDB
    const productionURI = process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI;
    await mongoose.connect(productionURI);
    console.log('✅ Connected to Production MongoDB\n');

    const Event = require('./models/Event');

    console.log('🎯 STEP 1: OVERALL VENUE.NAME STATISTICS');
    console.log('=' .repeat(45));
    
    const totalEvents = await Event.countDocuments({});
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    // Count events with no venue.name at all
    const noVenueNameEvents = await Event.countDocuments({
      $or: [
        { 'venue.name': { $exists: false } },
        { 'venue.name': null },
        { 'venue.name': '' },
        { 'venue.name': { $type: 'string', $regex: /^\s*$/ } }
      ]
    });
    
    console.log(`❌ Events missing venue.name: ${noVenueNameEvents}`);
    console.log(`✅ Events with venue.name: ${totalEvents - noVenueNameEvents}`);
    
    const missingPercentage = Math.round((noVenueNameEvents / totalEvents) * 100);
    console.log(`📉 Missing venue.name percentage: ${missingPercentage}%`);
    
    if (missingPercentage > 20) {
      console.log('🚨 CRITICAL: High percentage of events missing venue.name!');
    }

    console.log('\n🎯 STEP 2: CITY-BY-CITY VENUE.NAME ANALYSIS');
    console.log('=' .repeat(45));
    
    const cities = ['Calgary', 'Montreal', 'New York', 'Toronto', 'Vancouver'];
    const cityStats = {};
    
    for (const city of cities) {
      // Count total events that should be from this city (by scraper patterns)
      const cityPatterns = getCityScraperPatterns(city);
      const cityScraperRegex = new RegExp(cityPatterns.join('|'), 'i');
      
      const cityTotalEvents = await Event.countDocuments({
        $or: [
          { scraper: { $regex: cityScraperRegex } },
          { source: { $regex: cityScraperRegex } },
          { scraperId: { $regex: cityScraperRegex } },
          { sourceId: { $regex: cityScraperRegex } }
        ]
      });
      
      // Count how many have venue.name
      const cityWithVenueName = await Event.countDocuments({
        $and: [
          {
            $or: [
              { scraper: { $regex: cityScraperRegex } },
              { source: { $regex: cityScraperRegex } },
              { scraperId: { $regex: cityScraperRegex } },
              { sourceId: { $regex: cityScraperRegex } }
            ]
          },
          { 'venue.name': { $exists: true, $ne: null, $ne: '', $not: { $regex: /^\s*$/ } } }
        ]
      });
      
      const cityMissing = cityTotalEvents - cityWithVenueName;
      const cityMissingPercentage = cityTotalEvents > 0 ? Math.round((cityMissing / cityTotalEvents) * 100) : 0;
      
      cityStats[city] = {
        total: cityTotalEvents,
        withVenueName: cityWithVenueName,
        missing: cityMissing,
        missingPercentage: cityMissingPercentage
      };
      
      console.log(`🏙️ ${city}:`);
      console.log(`   📊 Total events: ${cityTotalEvents}`);
      console.log(`   ✅ With venue.name: ${cityWithVenueName}`);
      console.log(`   ❌ Missing venue.name: ${cityMissing} (${cityMissingPercentage}%)`);
      console.log('');
    }

    console.log('\n🎯 STEP 3: SCRAPER-BY-SCRAPER ANALYSIS');
    console.log('=' .repeat(40));
    
    // Find all unique scrapers and their venue.name statistics
    const scraperStats = await Event.aggregate([
      {
        $group: {
          _id: {
            scraper: { $ifNull: ['$scraper', { $ifNull: ['$source', { $ifNull: ['$scraperId', '$sourceId'] }] }] }
          },
          totalEvents: { $sum: 1 },
          withVenueName: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$venue.name', null] },
                    { $ne: ['$venue.name', ''] },
                    { $not: { $regexMatch: { input: '$venue.name', regex: '^\\s*$' } } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          missingVenueName: { $subtract: ['$totalEvents', '$withVenueName'] },
          missingPercentage: {
            $cond: [
              { $eq: ['$totalEvents', 0] },
              0,
              { $multiply: [{ $divide: [{ $subtract: ['$totalEvents', '$withVenueName'] }, '$totalEvents'] }, 100] }
            ]
          }
        }
      },
      { $sort: { missingPercentage: -1, totalEvents: -1 } }
    ]);

    console.log('🚨 SCRAPERS WITH HIGH MISSING VENUE.NAME RATES:');
    console.log('=' .repeat(50));
    
    const problematicScrapers = [];
    
    scraperStats.forEach((scraper, index) => {
      if (scraper.missingPercentage > 50 && scraper.totalEvents > 5) {
        const scraperName = scraper._id.scraper || 'Unknown';
        console.log(`${index + 1}. ${scraperName}`);
        console.log(`   📊 Total events: ${scraper.totalEvents}`);
        console.log(`   ✅ With venue.name: ${scraper.withVenueName}`);
        console.log(`   ❌ Missing: ${scraper.missingVenueName} (${Math.round(scraper.missingPercentage)}%)`);
        console.log('');
        
        problematicScrapers.push({
          name: scraperName,
          total: scraper.totalEvents,
          missing: scraper.missingVenueName,
          percentage: Math.round(scraper.missingPercentage)
        });
      }
    });

    console.log('\n🎯 STEP 4: SAMPLE EVENTS MISSING VENUE.NAME');
    console.log('=' .repeat(45));
    
    const sampleMissingEvents = await Event.find({
      $or: [
        { 'venue.name': { $exists: false } },
        { 'venue.name': null },
        { 'venue.name': '' },
        { 'venue.name': { $type: 'string', $regex: /^\s*$/ } }
      ]
    }).limit(10).lean();

    console.log('📋 SAMPLE EVENTS WITHOUT VENUE.NAME:');
    sampleMissingEvents.forEach((event, i) => {
      const scraper = event.scraper || event.source || event.scraperId || event.sourceId || 'Unknown';
      console.log(`${i + 1}. "${event.title}"`);
      console.log(`   Scraper: ${scraper}`);
      console.log(`   Venue: ${JSON.stringify(event.venue) || 'null'}`);
      console.log(`   Location: ${event.location || 'null'}`);
      console.log('');
    });

    console.log('\n🚀 RECOMMENDED ACTIONS:');
    console.log('=' .repeat(25));
    console.log('1. 🔧 Fix scrapers with high missing venue.name rates');
    console.log('2. 📝 Enforce venue.name population in scraper base classes');
    console.log('3. 🔄 Re-run scrapers for cities with high missing rates');
    console.log('4. 🎯 Add validation to ensure all events have venue.name');
    console.log('5. 📊 Monitor venue.name population rates ongoing');

    console.log('\n📊 PRIORITY CITIES TO FIX:');
    Object.entries(cityStats).forEach(([city, stats]) => {
      if (stats.missingPercentage > 30) {
        console.log(`🚨 HIGH PRIORITY: ${city} - ${stats.missingPercentage}% missing`);
      } else if (stats.missingPercentage > 10) {
        console.log(`⚠️ MEDIUM PRIORITY: ${city} - ${stats.missingPercentage}% missing`);
      } else {
        console.log(`✅ LOW PRIORITY: ${city} - ${stats.missingPercentage}% missing`);
      }
    });

    console.log('\n🏆 AUDIT COMPLETE!');
    console.log('🎯 Use this data to systematically fix venue.name population');
    console.log('📱 Proper venue.name population will maximize app event visibility');

  } catch (error) {
    console.error('❌ Error during scraper audit:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Production MongoDB connection closed');
  }
}

function getCityScraperPatterns(city) {
  const patterns = {
    'Calgary': [
      'calgary-', 'saddledome', 'stampede-', 'arts-commons',
      'telus-spark', 'heritage-park', 'calgary-zoo', 'glenbow-',
      'studio-bell', 'princes-island-park', 'eau-claire-',
      'kensington-', 'inglewood-', 'mission-', 'hillhurst-',
      'globalfest', 'calgary-folk', 'calgary-jazz'
    ],
    'Montreal': [
      'montreal-', 'bell-centre', 'place-des-arts', 'olympique-',
      'old-montreal', 'vieux-montreal', 'plateau-', 'mile-end-',
      'downtown-montreal', 'quartier-latin', 'saint-laurent-',
      'verdun-', 'westmount-', 'outremont-', 'salsatheque',
      'just-for-laughs', 'osheaga', 'montreal-jazz'
    ],
    'New York': [
      'apollo-theater', 'barclays-center', 'beacon-theatre', 'blue-note',
      'bowery-ballroom', 'broadway-theater', 'brooklyn-bowl', 'carnegie-hall',
      'comedy-cellar', 'madison-square-garden', 'msg-', 'radio-city',
      'yankee-stadium', 'terminal-5', 'village-vanguard', 'webster-hall',
      'lincoln-center', 'met-museum', 'brooklyn-bridge', 'central-park',
      'manhattan-', 'brooklyn-', 'bronx-', 'queens-', 'staten-island',
      'nyc-', 'new-york-', 'timeout-nyc', 'nycgo', 'amny-',
      'eventbrite-nyc', 'ticketmaster-nyc', 'seatgeek-nyc', 'livenation-nyc',
      'tribeca-film', 'nyfw-', 'anime-nyc', 'electric-zoo', 'governors-island',
      'hudson-river-park', 'prospect-park', 'times-square'
    ],
    'Toronto': [
      'toronto-', 'cn-tower', 'rogers-centre', 'scotiabank-arena',
      'roy-thomson-hall', 'massey-hall', 'danforth-music-hall',
      'phoenix-concert-theatre', 'rebel-nightclub', 'toybox-',
      'harbourfront-', 'distillery-district', 'casa-loma',
      'ontario-science-centre', 'royal-ontario-museum', 'ago-',
      'tiff-', 'toronto-international-film', 'pride-toronto',
      'gardiner-museum', 'textile-museum', 'moca-', 'history-',
      'loft-events', 'six-lounge', 'club-54', 'future-nightlife',
      'dirty-martini', 'x-club', 'flava-nightclub', 'cosmo-bar'
    ],
    'Vancouver': [
      'vancouver-', 'bc-place', 'rogers-arena', 'queen-elizabeth-theatre',
      'orpheum-', 'vogue-theatre', 'commodore-ballroom', 'the-roxy',
      'fortune-sound-club', 'celebrities-nightclub', 'stanley-park',
      'science-world', 'vancouver-art-gallery', 'ubc-', 'sfu-',
      'granville-island', 'english-bay', 'kitsilano-', 'gastown-',
      'yaletown-', 'downtown-vancouver', 'west-end-vancouver',
      'vancouver-civic', 'vancouver-international', 'viff-'
    ]
  };
  
  return patterns[city] || [];
}

// Run the comprehensive scraper audit
auditScraperVenueNames().catch(console.error);
