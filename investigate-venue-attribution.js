/**
 * VENUE ATTRIBUTION INVESTIGATION
 * Find why mobile app shows "Ballet BC" for all events
 */

const fs = require('fs');
const path = require('path');

// Test a few scrapers to see what venue names they produce
const testScrapers = [
  { city: 'vancouver', file: 'balletBC.js', expectedVenue: 'Ballet BC' },
  { city: 'vancouver', file: 'commodoreBallroom.js', expectedVenue: 'Commodore Ballroom' },
  { city: 'vancouver', file: 'bcPlace.js', expectedVenue: 'BC Place' },
  { city: 'Toronto', file: 'horseshoeTavern.js', expectedVenue: 'Horseshoe Tavern' }
];

async function investigateVenueAttribution() {
  console.log('🕵️ INVESTIGATING VENUE ATTRIBUTION ISSUE');
  console.log('========================================\n');
  
  for (const scraper of testScrapers) {
    const scraperPath = path.join(__dirname, 'scrapers', 'cities', scraper.city, scraper.file);
    
    try {
      if (fs.existsSync(scraperPath)) {
        console.log(`🔍 Testing: ${scraper.file}`);
        console.log(`   Expected venue: "${scraper.expectedVenue}"`);
        
        const scraperModule = require(scraperPath);
        let events;
        
        if (typeof scraperModule === 'function') {
          events = await scraperModule(scraper.city);
        } else if (scraperModule.scrape) {
          events = await scraperModule.scrape(scraper.city);
        } else {
          console.log(`❌ Export format issue\n`);
          continue;
        }
        
        if (events.length > 0) {
          const firstEvent = events[0];
          console.log(`   Actual venue: "${firstEvent.venue}"`);
          console.log(`   Sample event: "${firstEvent.title}"`);
          
          // Check if venue matches expected
          if (firstEvent.venue === scraper.expectedVenue) {
            console.log(`   ✅ VENUE CORRECT`);
          } else {
            console.log(`   ❌ VENUE MISMATCH!`);
          }
          
          // Check all events have consistent venue
          const venues = [...new Set(events.map(e => e.venue))];
          if (venues.length === 1) {
            console.log(`   ✅ All ${events.length} events have consistent venue`);
          } else {
            console.log(`   ⚠️ Mixed venues found: ${venues.join(', ')}`);
          }
        } else {
          console.log(`   ⚠️ No events found`);
        }
        
        console.log('');
        
      } else {
        console.log(`❌ ${scraper.file}: File not found\n`);
      }
    } catch (error) {
      console.log(`❌ ${scraper.file}: Error - ${error.message}\n`);
    }
  }
  
  console.log('🎯 ANALYSIS:');
  console.log('If scrapers produce correct venue names but mobile app shows "Ballet BC" for all,');
  console.log('the issue is likely in:');
  console.log('1. 📥 Import process (events.venue field not preserved)');
  console.log('2. 📱 Mobile app query/display logic');
  console.log('3. 🗄️ Database schema/field mapping');
  console.log('4. 🔄 Data transformation during import');
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Check import scripts to see how venue data is handled');
  console.log('2. Verify database schema includes venue field');
  console.log('3. Test a single event import to trace venue attribution');
  console.log('4. Check mobile app API queries for venue field');
}

investigateVenueAttribution().catch(console.error);
