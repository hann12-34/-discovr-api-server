/**
 * Test script for Hello Goodbye Bar scraper
 */

const helloGoodbyeBarEvents = require('./helloGoodbyeBarEvents');

// Add debug logging
console.log(`Testing test-hello-goodbye-bar-scraper.js...`);


async function testHelloGoodbyeBarScraper() {
  console.log('🔍 Testing Hello Goodbye Bar scraper...');
  console.log('==================================');
  
  try {
    // Run the scraper
    console.time('scrape-time');
    const events = await helloGoodbyeBarEvents.scrape();
    console.timeEnd('scrape-time');
    
    // Check for events
    console.log(`\n✅ Found ${events.length} events`);
    
    if (events.length > 0) {
      // Check for any signs of fallback data
      const containsFallbacks = events.some(event => 
        event.description?.toLowerCase().includes('fallback') || 
        event.title?.toLowerCase().includes('fallback') ||
        event.description?.toLowerCase().includes('projected') || 
        event.title?.toLowerCase().includes('projected')
      );
      
      if (containsFallbacks) {
        console.error('⚠️ WARNING: Possible fallback events detected!');
      } else {
        console.log('✅ No fallback events detected - all events are from live scraping');
      }
      
      // Display event details
      console.log('\n📋 EVENTS SUMMARY:');
      console.log('==================================');
      
      events.forEach((event, index) => {
        const startDate = new Date(event.startDate);
        
        console.log(`\n--- EVENT ${index + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}`);
        console.log(`Description: ${event.description.substring(0, 150)}${event.description.length > 150 ? '...' : ''}`);
        console.log(`Venue: ${event.venue.name}`);
        console.log(`Categories: ${event.categories.join(', ')}`);
        console.log(`Source: ${event.sourceURL}`);
        console.log(`Event ID: ${event.id}`);
      });
      
      // Display first event in full JSON
      console.log('\n📝 SAMPLE EVENT (FULL JSON):');
      console.log('==================================');
      console.log(JSON.stringify(events[0], null, 2));
      
    } else {
      console.log('⚠️ No events found. Check website structure or potential issues.');
    }
    
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
  }
}

// Run the test
try {
  testHelloGoodbyeBarScraper();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
