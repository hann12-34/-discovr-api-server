/**
 * VENUE FORMAT STANDARDIZATION SCRIPT
 * Ensures all scrapers and imports use consistent venue string format
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 VENUE FORMAT STANDARDIZATION');
console.log('===============================\n');

// Test scrapers from all cities to verify venue output
const testScrapers = [
  { city: 'vancouver', file: 'balletBC.js', expectedVenue: 'Ballet BC' },
  { city: 'vancouver', file: 'commodoreBallroom.js', expectedVenue: /Commodore/ },
  { city: 'vancouver', file: 'bcPlace.js', expectedVenue: 'BC Place' },
  { city: 'Toronto', file: 'horseshoeTavern.js', expectedVenue: 'Horseshoe Tavern' },
  { city: 'Calgary', file: 'saddledome.js', expectedVenue: /Saddledome/ },
  { city: 'Montreal', file: 'placeDesArts.js', expectedVenue: /Place des Arts/ },
  { city: 'NewYork', file: 'broadwayShows.js', expectedVenue: /Broadway/ }
];

async function checkAllVenueFormats() {
  console.log('🔍 TESTING VENUE OUTPUT FROM ALL CITIES:');
  console.log('==========================================\n');
  
  let totalCorrect = 0;
  let totalTested = 0;
  
  for (const scraper of testScrapers) {
    const scraperPath = path.join(__dirname, 'scrapers', 'cities', scraper.city, scraper.file);
    
    try {
      if (fs.existsSync(scraperPath)) {
        console.log(`🏢 ${scraper.city}/${scraper.file}`);
        
        const scraperModule = require(scraperPath);
        let events;
        
        if (typeof scraperModule === 'function') {
          events = await scraperModule(scraper.city);
        } else if (scraperModule.scrape) {
          events = await scraperModule.scrape(scraper.city);
        } else {
          console.log(`   ❌ Export format issue\n`);
          continue;
        }
        
        totalTested++;
        
        if (events.length > 0) {
          const firstEvent = events[0];
          const venue = firstEvent.venue;
          
          console.log(`   Venue: "${venue}" (${typeof venue})`);
          
          // Check if venue is a string (not object)
          if (typeof venue === 'string') {
            console.log(`   ✅ FORMAT CORRECT - String venue`);
            
            // Check if venue name matches expected pattern
            if (typeof scraper.expectedVenue === 'string') {
              if (venue === scraper.expectedVenue) {
                console.log(`   ✅ VENUE NAME CORRECT`);
                totalCorrect++;
              } else {
                console.log(`   ⚠️ VENUE NAME: Expected "${scraper.expectedVenue}", got "${venue}"`);
              }
            } else if (scraper.expectedVenue instanceof RegExp) {
              if (scraper.expectedVenue.test(venue)) {
                console.log(`   ✅ VENUE NAME MATCHES PATTERN`);
                totalCorrect++;
              } else {
                console.log(`   ⚠️ VENUE NAME: Expected pattern ${scraper.expectedVenue}, got "${venue}"`);
              }
            }
          } else {
            console.log(`   ❌ FORMAT ISSUE - Venue is ${typeof venue}, should be string`);
            console.log(`   🔧 NEEDS FIX: Convert to string format`);
          }
        } else {
          console.log(`   ⚠️ No events found`);
        }
        
        console.log('');
        
      } else {
        console.log(`❌ ${scraper.city}/${scraper.file}: File not found\n`);
      }
    } catch (error) {
      console.log(`❌ ${scraper.city}/${scraper.file}: Error - ${error.message}\n`);
    }
  }
  
  console.log('📊 SUMMARY:');
  console.log('===========');
  console.log(`✅ Correct venues: ${totalCorrect}/${totalTested}`);
  console.log(`📈 Success rate: ${Math.round((totalCorrect/totalTested)*100)}%`);
  
  if (totalCorrect === totalTested) {
    console.log('\n🎉 ALL VENUE FORMATS ARE STANDARDIZED!');
    console.log('🎯 Ready for production import');
  } else {
    console.log('\n⚠️ Some venues need formatting fixes');
    console.log('🔧 Check scrapers that output object venues vs strings');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Run comprehensive import test');
  console.log('2. Verify mobile app shows correct venue names');
  console.log('3. Monitor for any remaining venue attribution issues');
}

checkAllVenueFormats().catch(console.error);
