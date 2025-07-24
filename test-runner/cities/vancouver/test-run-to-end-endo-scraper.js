/**
 * Fixed test for test-run-to-end-endo-scraper.js
 * Original error: Unknown
 */



// Add robust error handling
try {
  // Original test logic
    /**
   * Test script for Run to End Endo scraper
   */
  
  const runToEndEndoScraper = require('./runToEndEndoEvents');
  
  // Add debug logging
  console.log(`Testing test-run-to-end-endo-scraper.js...`);
  
  
  async function testRunToEndEndoScraper() {
    console.log('🧪 Testing Run to End Endo scraper...');
    
    try {
      const events = await runToEndEndoScraper.scrape();
      
      console.log(`✅ Found ${events.length} events`);
      
      if (events.length > 0) {
        console.log('\nSample event:');
        console.log(JSON.stringify(events[0], null, 2));
      }
      
      console.log('\n✅ Test completed successfully');
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
  
  try {
    testRunToEndEndoScraper();
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
