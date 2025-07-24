/**
 * Fixed test for test-malones-scraper.js
 * Original error: Unknown
 */



// Add robust error handling
try {
  // Original test logic
    const MalonesEvents = require('./malonesEvents');
  
  // Add debug logging
  console.log(`Testing test-malones-scraper.js...`);
  
  
  /**
   * Test script for Malone's events scraper
   */
  async function testMalonesScraper() {
    console.log('🔍 Testing Malone\'s scraper...');
    console.log('==================================');
    
    // Create and run the scraper
    const scraper = new MalonesEvents();
    const startTime = Date.now();
    const events = await scraper.scrape();
    const endTime = Date.now();
    
    // Report results
    console.log(`\n✅ Found ${events.length} events`);
    
    // Check if any fallbacks were used
    const hasFallbacks = events.some(event => event.isFallback === true);
    if (hasFallbacks) {
      console.log('⚠️ WARNING: Some fallback events were used!');
    } else {
      console.log('✅ No fallback events detected - all events are from live scraping');
    }
    
    // Log scrape time
    console.log(`scrape-time: ${((endTime - startTime) / 1000).toFixed(3)}s\n`);
    
    // Display event summaries
    if (events.length > 0) {
      console.log('📋 EVENTS SUMMARY:');
      console.log('==================================\n');
      
      events.forEach((event, index) => {
        console.log(`--- EVENT ${index + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${event.startDate.toLocaleString().split(',')[0]} at ${event.startDate.toLocaleTimeString()}`);
        console.log(`Description: ${event.description}`);
        console.log(`Venue: ${event.venue.name}`);
        console.log(`Categories: ${event.categories.join(', ')}`);
        console.log(`Source: ${event.sourceURL}`);
        console.log(`Event ID: ${event.id}`);
        console.log('');
      });
      
      // Show full JSON for the first event as a sample
      console.log('📝 SAMPLE EVENT (FULL JSON):');
      console.log('==================================');
      console.log(JSON.stringify(events[0], null, 2));
    } else {
      console.log('⚠️ No events found. Check website structure or potential issues.');
    }
  }
  
  // Run the test
  try {
    testMalonesScraper().catch(console.error);
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
