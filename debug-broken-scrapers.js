/**
 * Debug script to test why certain Vancouver scrapers are failing validation
 */

const path = require('path');

// List of scrapers that are failing
const brokenScrapers = [
  'redRoom.js',
  'redRoomEvents.js', 
  'levelsNightclub.js',
  'fortuneSoundClub.js',
  'orpheumEvents.js',
  'orpheumTheatre.js',
  'orpheumTheatreEvents.js'
];

function debugScraper(scraperName) {
  const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', scraperName);
  
  console.log(`\n🔍 Testing: ${scraperName}`);
  console.log(`Path: ${scraperPath}`);
  
  try {
    // Try to require the scraper
    const ScraperClass = require(scraperPath);
    
    console.log(`✅ Successfully required`);
    console.log(`Type: ${typeof ScraperClass}`);
    
    if (typeof ScraperClass === 'function') {
      console.log(`✅ Is function (class)`);
      console.log(`Has prototype: ${!!ScraperClass.prototype}`);
      console.log(`Has prototype.scrape: ${!!ScraperClass.prototype.scrape}`);
      console.log(`Has static scrape: ${!!ScraperClass.scrape}`);
      
      // Test validation logic
      const isValid = (typeof ScraperClass === 'function' && 
                      (ScraperClass.prototype.scrape || ScraperClass.scrape)) ||
                     (typeof ScraperClass === 'object' && typeof ScraperClass.scrapeEvents === 'function');
      
      console.log(`Validation result: ${isValid}`);
      
      // Try to instantiate
      try {
        const instance = new ScraperClass();
        console.log(`✅ Can instantiate`);
        console.log(`Instance has scrape: ${typeof instance.scrape === 'function'}`);
      } catch (err) {
        console.log(`❌ Cannot instantiate: ${err.message}`);
      }
      
    } else if (typeof ScraperClass === 'object') {
      console.log(`✅ Is object`);
      console.log(`Has scrape method: ${typeof ScraperClass.scrape === 'function'}`);
      console.log(`Has scrapeEvents method: ${typeof ScraperClass.scrapeEvents === 'function'}`);
    } else {
      console.log(`❌ Unexpected type: ${typeof ScraperClass}`);
    }
    
  } catch (error) {
    console.log(`❌ Error requiring: ${error.message}`);
    if (error.stack) {
      console.log(`Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }
}

// Test all broken scrapers
brokenScrapers.forEach(debugScraper);

console.log('\n🎯 Debug complete!');
