/**
 * Test script for the Vancouver Civic Theatres scraper
 * 
 * This script tests the Vancouver Civic Theatres scraper and prints sample events
 */

const vancouverCivicTheatres = require('./cities/vancouver/vancouverCivicTheatres');

async function testScraper() {
  console.log('🧪 Testing Vancouver Civic Theatres scraper...');
  
  try {
    // Run the scraper
    const events = await vancouverCivicTheatres.scrape();
    
    // Check if events were found
    if (events && events.length > 0) {
      console.log(`✅ Success! Found ${events.length} events`);
      
      // Print venue details
      console.log('\n📍 Venue details:');
      console.log(JSON.stringify(events[0].venue, null, 2));
      
      // Print first event details
      console.log('\n🎭 Sample event:');
      console.log(JSON.stringify(events[0], null, 2));
      
    } else {
      console.log('❌ No events found. The scraper may need to be updated or the website structure might have changed.');
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

// Run the test
testScraper();
