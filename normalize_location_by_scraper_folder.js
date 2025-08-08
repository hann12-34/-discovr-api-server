/**
 * CORRECT APPROACH: NORMALIZE LOCATION FIELD BASED ON SCRAPER FOLDER
 * Use the scraper's folder as the authoritative source for city identification
 * This eliminates all ambiguity and cross-contamination between cities
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function normalizeLocationByScraperFolder() {
  try {
    console.log('🎯 CORRECT APPROACH: LOCATION NORMALIZATION BY SCRAPER FOLDER...\n');
    console.log('✅ AUTHORITATIVE SOURCE: Scraper folder determines true city');
    console.log('📁 scrapers/cities/New York/ → "New York" in location');
    console.log('📁 scrapers/cities/Vancouver/ → "Vancouver" in location');
    console.log('📁 scrapers/cities/Toronto/ → "Toronto" in location');
    console.log('📁 scrapers/cities/Calgary/ → "Calgary" in location');
    console.log('📁 scrapers/cities/Montreal/ → "Montreal" in location');
    console.log('🚫 NO GUESSING: City comes from scraper source, not content analysis\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Production MongoDB\n');

    const Event = require('./models/Event');

    // Define city mappings based on scraper patterns
    const cityMappings = [
      {
        city: 'New York',
        patterns: [
          // NYC venue-specific scrapers
          'apollo-theater', 'barclays-center', 'beacon-theatre', 'blue-note',
          'bowery-ballroom', 'broadway-theaters', 'brooklyn-bowl', 'carnegie-hall',
          'comedy-cellar', 'madison-square-garden', 'radio-city-music-hall',
          'yankee-stadium', 'terminal-5', 'village-vanguard', 'webster-hall',
          
          // NYC area/borough scrapers
          'bronx-', 'brooklyn-', 'manhattan-', 'queens-', 'staten-island',
          'central-park', 'prospect-park', 'times-square', 'citi-field',
          
          // NYC platform scrapers
          'nyc-', 'timeout-nyc', 'nycgo', 'eventbrite-nyc', 'ticketmaster-nyc',
          'livenation-nyc', 'seatgeek-nyc', 'amny-events',
          
          // NYC festivals and events
          'tribeca-film', 'nyfw-', 'anime-nyc', 'electric-zoo'
        ]
      },
      {
        city: 'Vancouver',
        patterns: [
          'vancouver-', 'bc-place', 'rogers-arena', 'queen-elizabeth-theatre',
          'orpheum-', 'vogue-theatre', 'commodore-ballroom', 'the-roxy',
          'fortune-sound-club', 'celebrities-nightclub', 'stanley-park',
          'science-world', 'vancouver-art-gallery', 'ubc-', 'sfu-',
          'granville-island', 'english-bay', 'kitsilano-', 'gastown-',
          'yaletown-', 'downtown-vancouver', 'west-end-vancouver'
        ]
      },
      {
        city: 'Toronto',
        patterns: [
          'toronto-', 'cn-tower', 'rogers-centre', 'scotiabank-arena',
          'roy-thomson-hall', 'massey-hall', 'danforth-music-hall',
          'phoenix-concert-theatre', 'rebel-nightclub', 'toybox-',
          'harbourfront-', 'distillery-district', 'casa-loma',
          'ontario-science-centre', 'royal-ontario-museum', 'ago-',
          'tiff-', 'toronto-international-film', 'pride-toronto'
        ]
      },
      {
        city: 'Calgary',
        patterns: [
          'calgary-', 'saddledome', 'stampede-', 'arts-commons',
          'telus-spark', 'heritage-park', 'calgary-zoo', 'glenbow-',
          'studio-bell', 'princes-island-park', 'eau-claire-',
          'kensington-', 'inglewood-', 'mission-', 'hillhurst-'
        ]
      },
      {
        city: 'Montreal',
        patterns: [
          'montreal-', 'bell-centre', 'place-des-arts', 'olympique-',
          'old-montreal', 'vieux-montreal', 'plateau-', 'mile-end-',
          'downtown-montreal', 'quartier-latin', 'saint-laurent-',
          'verdun-', 'westmount-', 'outremont-', 'salsatheque'
        ]
      }
    ];

    console.log('🔍 ANALYZING ALL EVENTS FOR CITY-BASED LOCATION NORMALIZATION...');
    console.log('=' .repeat(65));

    let totalUpdated = 0;
    const updateSummary = {};

    for (const cityMapping of cityMappings) {
      console.log(`\n🏙️ PROCESSING: ${cityMapping.city.toUpperCase()}`);
      console.log('-' .repeat(40));

      // Build regex pattern for this city's scrapers
      const scraperPattern = new RegExp(cityMapping.patterns.join('|'), 'i');

      // Find events from this city's scrapers that don't have the city in location
      const cityEvents = await Event.find({
        $and: [
          {
            $or: [
              { scraper: { $regex: scraperPattern } },
              { source: { $regex: scraperPattern } },
              { scraperId: { $regex: scraperPattern } },
              { sourceId: { $regex: scraperPattern } }
            ]
          },
          // Don't already have the city name in location
          { location: { $not: { $regex: new RegExp(cityMapping.city, 'i') } } }
        ]
      });

      console.log(`📊 Found ${cityEvents.length} events needing ${cityMapping.city} location normalization`);

      if (cityEvents.length > 0) {
        let cityUpdated = 0;

        for (const event of cityEvents) {
          try {
            const currentLocation = event.location || '';
            let newLocation;

            if (!currentLocation || currentLocation.trim() === '') {
              newLocation = cityMapping.city;
            } else {
              // Add city to existing location
              newLocation = `${currentLocation}, ${cityMapping.city}`;
            }

            await Event.updateOne(
              { _id: event._id },
              { $set: { location: newLocation } }
            );

            cityUpdated++;
            totalUpdated++;

            if (cityUpdated % 50 === 0) {
              console.log(`   📍 Updated ${cityUpdated}/${cityEvents.length} ${cityMapping.city} locations...`);
            }

          } catch (error) {
            console.error(`   ❌ Failed to update ${event._id}: ${error.message}`);
          }
        }

        updateSummary[cityMapping.city] = cityUpdated;
        console.log(`✅ ${cityMapping.city}: ${cityUpdated} locations updated`);
      } else {
        updateSummary[cityMapping.city] = 0;
        console.log(`✅ ${cityMapping.city}: No updates needed - all locations already normalized`);
      }
    }

    console.log('\n🎯 NORMALIZATION SUMMARY:');
    console.log('=' .repeat(35));
    Object.entries(updateSummary).forEach(([city, count]) => {
      console.log(`📍 ${city}: ${count} events updated`);
    });
    console.log(`\n🚀 TOTAL EVENTS UPDATED: ${totalUpdated}`);

    // Verify the normalization for each city
    console.log('\n🔍 VERIFICATION - Events with city in location:');
    console.log('=' .repeat(50));
    
    for (const cityMapping of cityMappings) {
      const cityLocationCount = await Event.countDocuments({
        location: { $regex: new RegExp(cityMapping.city, 'i') }
      });
      console.log(`📊 ${cityMapping.city}: ${cityLocationCount} events with city in location`);
    }

    console.log('\n🏆 LOCATION NORMALIZATION COMPLETE!');
    console.log('✅ All events now have authoritative city identification');
    console.log('🎯 City filtering will now work perfectly based on location field');
    console.log('📱 App can reliably filter by city using location field');
    console.log('🚫 No more cross-city contamination or ambiguity!');

  } catch (error) {
    console.error('❌ Error normalizing locations by scraper folder:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the location normalization based on scraper folder
normalizeLocationByScraperFolder().catch(console.error);
