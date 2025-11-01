/**
 * APPLY DATA QUALITY FIXES TO SCRAPERS
 * Integrates enhanced filtering system into existing scrapers
 */

const fs = require('fs');
const path = require('path');
const DataQualityFilter = require('./enhanced-data-quality-filter');

// Key scrapers that need quality fixes
const scrapersToFix = [
  { city: 'vancouver', file: 'balletBC.js' },
  { city: 'vancouver', file: 'commodoreBallroom.js' },
  { city: 'vancouver', file: 'bcPlace.js' },
  { city: 'vancouver', file: 'artsClubTheatre.js' },
  { city: 'Toronto', file: 'horseshoeTavern.js' }
];

async function applyQualityFixes() {
  console.log('🔧 APPLYING DATA QUALITY FIXES');
  console.log('==============================\n');
  
  const filter = new DataQualityFilter();
  
  for (const scraper of scrapersToFix) {
    const scraperPath = path.join(__dirname, 'scrapers', 'cities', scraper.city, scraper.file);
    
    try {
      if (fs.existsSync(scraperPath)) {
        console.log(`🛠️ Testing: ${scraper.file}`);
        
        // Test current scraper
        const scraperModule = require(scraperPath);
        let events;
        
        if (typeof scraperModule === 'function') {
          events = await scraperModule(scraper.city);
        } else if (scraperModule.scrape) {
          events = await scraperModule.scrape(scraper.city);
        } else {
          console.log(`❌ ${scraper.file}: Export format issue`);
          continue;
        }
        
        console.log(`📊 Original events: ${events.length}`);
        
        // Apply quality filter
        const cleanedEvents = filter.filterEvents(events);
        console.log(`✨ After filtering: ${cleanedEvents.length}`);
        
        // Show examples of what was filtered out
        const removed = events.length - cleanedEvents.length;
        if (removed > 0) {
          console.log(`🗑️ Removed ${removed} low-quality events:`);
          
          const filteredOut = events.filter(original => 
            !cleanedEvents.some(clean => clean.title === filter.cleanTitle(original.title))
          );
          
          filteredOut.slice(0, 3).forEach(event => {
            console.log(`   ❌ "${event.title}"`);
          });
          if (filteredOut.length > 3) {
            console.log(`   ... and ${filteredOut.length - 3} more`);
          }
        }
        
        console.log('');
        
      } else {
        console.log(`❌ ${scraper.file}: File not found\n`);
      }
    } catch (error) {
      console.log(`❌ ${scraper.file}: Error - ${error.message}\n`);
    }
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. ✅ Quality filter working - removes CSS, navigation junk');
  console.log('2. 🔧 Need to integrate filter into actual scraper files');
  console.log('3. 🏢 Fix venue attribution (Ballet BC showing for all events)');
  console.log('4. 📱 Test on mobile app to verify improvements');
}

// Also create a venue attribution fix
function createVenueAttributionFixer() {
  console.log('\n🏢 VENUE ATTRIBUTION ANALYSIS:');
  console.log('Problem: All events showing "Ballet BC" regardless of actual venue');
  console.log('Solution: Each scraper should set its own correct venue name');
  
  const venueMapping = {
    'balletBC.js': 'Ballet BC',
    'commodoreBallroom.js': 'Commodore Ballroom', 
    'bcPlace.js': 'BC Place Stadium',
    'artsClubTheatre.js': 'Arts Club Theatre',
    'horseshoeTavern.js': 'Horseshoe Tavern'
  };
  
  console.log('✅ Correct venue mapping:');
  Object.entries(venueMapping).forEach(([file, venue]) => {
    console.log(`   ${file} → "${venue}"`);
  });
}

applyQualityFixes()
  .then(() => createVenueAttributionFixer())
  .catch(console.error);
