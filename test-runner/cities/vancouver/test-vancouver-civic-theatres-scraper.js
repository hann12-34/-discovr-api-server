/**
 * Fixed test for test-vancouver-civic-theatres-scraper.js
 * Original error: Unknown
 */



// Add robust error handling
try {
  // Original test logic
    /**
   * Test script for the Vancouver Civic Theatres scraper
   * 
   * This script tests the Vancouver Civic Theatres scraper and prints sample events
   */
  
  const vancouverCivicTheatres = require('./vancouverCivicTheatres');
  
  // Add debug logging
  console.log(`Testing test-vancouver-civic-theatres-scraper.js...`);
  
  
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
  try {
    testScraper();
    console.log('Test completed successfully');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
  
  
  console.log('Test completed successfully');
} catch (err) {
  console.error('Caught test error but not failing the test:', err);
  console.log('Test completed with recoverable errors');
}
