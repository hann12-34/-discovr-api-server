/**
 * Test script for the remaining "broken" scrapers
 */

const path = require('path');

// List of scrapers that need fixing
const brokenScrapers = [
  'junctionPublicMarket.js',
  'khatsahlanoEvents.js', 
  'kitsilanoShowboat.js',
  'rickshawTheatreEvents.js',
  'roxyEvents.js'  // Test main roxy file too
];

function testScraper(scraperName) {
  const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', scraperName);
  
  console.log(`\n🔍 Testing: ${scraperName}`);
  
  try {
    // Try to require the scraper
    const ScraperClass = require(scraperPath);
    
    console.log(`✅ Successfully required`);
    console.log(`Type: ${typeof ScraperClass}`);
    
    // Test the validation logic exactly as in the import script
    const isValidClass = typeof ScraperClass === 'function' && 
                        (ScraperClass.prototype && typeof ScraperClass.prototype.scrape === 'function');
    const isValidFunction = typeof ScraperClass === 'function' && !ScraperClass.prototype;
    const isValidObjectWithScrape = typeof ScraperClass === 'object' && 
                                   typeof ScraperClass.scrape === 'function';
    const isValidObjectWithScrapeEvents = typeof ScraperClass === 'object' && 
                                          typeof ScraperClass.scrapeEvents === 'function';
    
    const isValid = isValidClass || isValidFunction || isValidObjectWithScrape || isValidObjectWithScrapeEvents;
    
    console.log(`✅ Validation result: ${isValid}`);
    
    if (typeof ScraperClass === 'function' && ScraperClass.prototype) {
      console.log(`Has prototype.scrape: ${typeof ScraperClass.prototype.scrape === 'function'}`);
      
      // Try to instantiate
      try {
        const instance = new ScraperClass();
        console.log(`✅ Can instantiate: true`);
        console.log(`Instance has scrape: ${typeof instance.scrape === 'function'}`);
        if (instance.name) console.log(`Instance name: ${instance.name}`);
      } catch (err) {
        console.log(`❌ Cannot instantiate: ${err.message}`);
      }
    } else if (typeof ScraperClass === 'object') {
      console.log(`Has scrape method: ${typeof ScraperClass.scrape === 'function'}`);
      console.log(`Has scrapeEvents method: ${typeof ScraperClass.scrapeEvents === 'function'}`);
    }
    
  } catch (error) {
    console.log(`❌ Error requiring: ${error.message}`);
    if (error.stack) {
      console.log(`Stack (first few lines): ${error.stack.split('\n').slice(0, 5).join('\n')}`);
    }
  }
}

// Test all scrapers
brokenScrapers.forEach(testScraper);

console.log('\n🎯 Test complete!');
