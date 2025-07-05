/**
 * Test script for Vancouver Mysteries Theatre scraper
 * 
 * This script tests the scraper's ability to extract events from the Vancouver Mysteries website
 */

const vancouverMysteriesScraper = require('./scrapers/cities/vancouver/vancouverMysteriesEvents');

async function testScraper() {
  console.log('🧪 Testing Vancouver Mysteries Theatre scraper...');
  
  try {
    // Run the scraper
    const events = await vancouverMysteriesScraper.scrape();
    
    console.log(`✅ Found ${events.length} events`);
    
    if (events.length > 0) {
      // Print sample event data
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
    }
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Run the test
testScraper();
