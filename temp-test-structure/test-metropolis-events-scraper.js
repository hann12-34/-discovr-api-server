/**
 * Test script for Metropolis at Metrotown events scraper
 * 
 * This script tests the scraper's ability to extract events from the Metropolis website
 */

const metropolisScraper = require('../metropolisEvents');

async function testScraper() {
  console.log('🧪 Testing Metropolis at Metrotown scraper...');
  
  try {
    // Run the scraper
    const events = await metropolisScraper.scrape();
    
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
