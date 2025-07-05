/**
 * Test script for Arc Dining Garden Dinners scraper
 * 
 * This script tests the scraper's ability to extract events from the Arc Dining website
 */

const arcDiningScraper = require('./scrapers/cities/vancouver/arcDiningEvents');

async function testScraper() {
  console.log('🧪 Testing Arc Dining Garden Dinners scraper...');
  
  try {
    // Run the scraper
    const events = await arcDiningScraper.scrape();
    
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
