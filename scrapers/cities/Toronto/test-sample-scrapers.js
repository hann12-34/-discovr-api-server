const { getCityFromArgs } = require('../../utils/city-util.js');

/**
 * Focused test script for a sample of Toronto scrapers
 * Tests just 3-5 scrapers at a time for targeted verification
 */

// Sample of scrapers to test (just a few at a time)
const sampleScrapers = [
  './scrape-university-of-toronto-events.js',
  './scrape-distillery-district-events.js', 
  './scrape-kensington-market-events.js',
  './scrape-gerrard-india-bazaar.js',
  './scrape-steam-whistle-events.js'
];

async function testSampleScrapers() {
  console.log('🧪 Testing sample Toronto scrapers...\n');
  
  for (const scraperPath of sampleScrapers) {
    console.log(`\n📋 Testing ${scraperPath}...`);
    
    try {
      // Try to require the scraper to check for syntax errors
      const scraper = require(scraperPath);
      console.log(`✅ ${scraperPath} - Syntax OK`);
      
      // If it has a main export function, we could test it briefly
      if (typeof scraper === 'function') {
        console.log(`📝 ${scraperPath} - Has main export function`);
      } else if (scraper && typeof scraper === 'object') {
        const methods = Object.keys(scraper);
        console.log(`📝 ${scraperPath} - Exports: ${methods.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ ${scraperPath} - ERROR:`, error.message);
      
      // Show the specific line if it's a syntax error
      if (error.message.includes('SyntaxError') || error.message.includes('Unexpected token')) {
        const lines = error.stack.split('\n');
        const errorLine = lines.find(line => line.includes(scraperPath));
        if (errorLine) {
          console.error(`   📍 ${errorLine.trim()}`);
        }
      }
    }
  }
  
  console.log(`\n🏁 Sample test completed for ${sampleScrapers.length} scrapers`);
}

// Run the test
if (require.main === module) {
  testSampleScrapers();
}

module.exports = { testSampleScrapers };
