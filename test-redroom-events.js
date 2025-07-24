/**
 * Quick test for redRoomEvents.js validation
 */

const path = require('path');

// Test the specific scraper
const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', 'redRoomEvents.js');

console.log(`🔍 Testing: redRoomEvents.js`);
console.log(`Path: ${scraperPath}`);

try {
  const ScraperClass = require(scraperPath);
  
  console.log(`✅ Successfully required`);
  console.log(`Type: ${typeof ScraperClass}`);
  console.log(`Is function: ${typeof ScraperClass === 'function'}`);
  console.log(`Has prototype: ${!!ScraperClass.prototype}`);
  
  if (ScraperClass.prototype) {
    console.log(`Prototype has scrape: ${typeof ScraperClass.prototype.scrape === 'function'}`);
    console.log(`Scrape method exists: ${!!ScraperClass.prototype.scrape}`);
    
    // Test the validation logic exactly as in the import script
    const isValidClass = typeof ScraperClass === 'function' && 
                        (ScraperClass.prototype && typeof ScraperClass.prototype.scrape === 'function');
    
    console.log(`✅ Validation result: ${isValidClass}`);
    
    // Try to instantiate
    if (isValidClass) {
      const instance = new ScraperClass();
      console.log(`✅ Can instantiate: true`);
      console.log(`Instance has scrape: ${typeof instance.scrape === 'function'}`);
      console.log(`Instance name: ${instance.name}`);
    }
  }
  
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
  console.log(error.stack);
}

console.log('\n🎯 Test complete!');
