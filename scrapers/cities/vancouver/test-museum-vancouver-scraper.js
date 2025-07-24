/**
 * Test script for Museum of Vancouver Paddle Carving events scraper
 * 
 * This script tests the scraper's ability to extract paddle carving workshop events
 * from the Museum of Vancouver website
 */

const museumOfVancouverScraper = require('./scrapers/cities/vancouver/museumOfVancouverEvents');

async function testScraper() {
  console.log('🧪 Testing Museum of Vancouver Paddle Carving scraper...');
  
  try {
    // Run the scraper
    const events = await museumOfVancouverScraper.scrape();
    
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
