/**
 * Script to test The Cultch scraper specifically
 */
const path = require('path');

// Import the scraper
const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', 'backup', 'cultch-scraper.js');
const importCultchPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', 'backup', 'import-cultch-events.js');

async function testCultchScraper() {
  console.log('======================================================');
  console.log('TESTING THE CULTCH SCRAPERS');
  console.log('======================================================');
  
  try {
    // Try the main cultch-scraper.js first
    console.log(`\nTesting: cultch-scraper.js`);
    const cultchScraper = require(scraperPath);
    console.log('Module exports:', Object.keys(cultchScraper));
    
    if (typeof cultchScraper.scrape === 'function') {
      console.log('Running scrape() function...');
      const events = await cultchScraper.scrape();
      
      if (Array.isArray(events)) {
        console.log(`✅ cultch-scraper.js returned ${events.length} events`);
        
        if (events.length > 0) {
          console.log('\nSample events:');
          events.slice(0, 3).forEach((event, index) => {
            console.log(`\nEvent ${index + 1}:`);
            console.log(`  Title: "${event.title || 'No title'}"`);
            console.log(`  Date: ${new Date(event.startDate || Date.now()).toLocaleDateString()}`);
            console.log(`  Venue: ${event.venue?.name || 'Unknown venue'}`);
            if (event.description) {
              console.log(`  Description: "${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}"`);
            }
          });
        }
      } else {
        console.log(`❌ cultch-scraper.js did not return an array of events`);
      }
    } else {
      console.log(`❌ cultch-scraper.js does not have a scrape function`);
    }
  } catch (error) {
    console.log(`❌ Error testing cultch-scraper.js: ${error.message}`);
    console.log(error.stack);
  }
  
  try {
    // Try the import-cultch-events.js as fallback
    console.log(`\nTesting: import-cultch-events.js`);
    const importCultch = require(importCultchPath);
    console.log('Module exports:', Object.keys(importCultch));
    
    if (typeof importCultch.scrape === 'function') {
      console.log('Running scrape() function...');
      const events = await importCultch.scrape();
      
      if (Array.isArray(events)) {
        console.log(`✅ import-cultch-events.js returned ${events.length} events`);
        
        if (events.length > 0) {
          console.log('\nSample events:');
          events.slice(0, 3).forEach((event, index) => {
            console.log(`\nEvent ${index + 1}:`);
            console.log(`  Title: "${event.title || 'No title'}"`);
            console.log(`  Date: ${new Date(event.startDate || Date.now()).toLocaleDateString()}`);
            console.log(`  Venue: ${event.venue?.name || 'Unknown venue'}`);
            if (event.description) {
              console.log(`  Description: "${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}"`);
            }
          });
        }
      } else {
        console.log(`❌ import-cultch-events.js did not return an array of events`);
      }
    } else {
      console.log(`❌ import-cultch-events.js does not have a scrape function`);
    }
  } catch (error) {
    console.log(`❌ Error testing import-cultch-events.js: ${error.message}`);
    console.log(error.stack);
  }
}

// Run the test
testCultchScraper().catch(console.error);
