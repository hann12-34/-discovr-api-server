/**
 * Test script for the Rogers Arena scraper
 * 
 * This script tests the Rogers Arena scraper and prints sample events
 */

const rogersArena = require('./cities/vancouver/rogersArena');

async function testScraper() {
  console.log('🧪 Testing Rogers Arena scraper...');
  
  try {
    // Run the scraper
    const events = await rogersArena.scrape();
    
    // Check if events were found
    if (events && events.length > 0) {
      console.log(`✅ Success! Found ${events.length} events`);
      
      // Print venue details
      console.log('\n📍 Venue details:');
      console.log(JSON.stringify(events[0].venue, null, 2));
      
      // Print first event details
      console.log('\n🎟️ Sample event:');
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
