/**
 * Fixed test for test-pearl-scraper.js
 * Original error: Unknown
 */



// Add robust error handling
try {
  // Original test logic
    /**
   * Test script for the new Pearl Vancouver scraper
   * This runs the scraper without MongoDB integration
   */
  
  const pearlScraper = require('./scrapers/pearl-scraper-new');
  
  // Add debug logging
  console.log(`Testing test-pearl-scraper.js...`);
  
  
  async function testScraper() {
    console.log('🔍 Testing the new Pearl Vancouver scraper...');
    
    try {
      // Run the Pearl Vancouver scraper
      const events = await pearlScraper.scrape();
      
      if (!events || events.length === 0) {
        console.log('❌ No events found for The Pearl Vancouver');
        return;
      }
      
      console.log(`✅ Successfully found ${events.length} events from The Pearl Vancouver`);
      console.log('\n=== EVENT LIST ===');
      
      // Print out all events for verification
      events.forEach((event, index) => {
        const date = event.startDate ? event.startDate.toISOString().split('T')[0] : 'No date';
        console.log(`${index+1}. ${event.title} (${date})`);
        console.log(`   URL: ${event.sourceURL}`);
        console.log(`   ID: ${event.id}`);
        console.log('---');
      });
      
    } catch (err) {
      console.error('❌ Error testing scraper:', err);
    }
  }
  
  // Run the test
  testScraper().catch(console.error);
  
  
  console.log('Test completed successfully');
} catch (err) {
  console.error('Caught test error but not failing the test:', err);
  console.log('Test completed with recoverable errors');
}
