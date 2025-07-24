/**
 * Test script for the Coastal Jazz Festival scraper
 * 
 * This script tests the Coastal Jazz Festival scraper and prints sample events
 */

const coastalJazzFestival = require('./coastalJazzFestival');

// Add debug logging
console.log(`Testing test-coastal-jazz-festival-scraper.js...`);


async function testScraper() {
  console.log('🧪 Testing Coastal Jazz Festival scraper...');
  
  try {
    // Run the scraper
    const events = await coastalJazzFestival.scrape();
    
    // Check if events were found
    if (events && events.length > 0) {
      console.log(`✅ Success! Found ${events.length} events`);
      
      // Print venue details
      console.log('\n📍 Venue details:');
      console.log(JSON.stringify(events[0].venue, null, 2));
      
      // Print first event details
      console.log('\n🎵 Sample event:');
      console.log(JSON.stringify(events[0], null, 2));
      
    } else {
      console.log('❌ No events found. The scraper may need to be updated or the website structure might have changed.');
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

// Run the test
try {
  testScraper();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
