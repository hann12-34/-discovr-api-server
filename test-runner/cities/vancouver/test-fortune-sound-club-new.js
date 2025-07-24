/**
 * Test Fortune Sound Club Scraper (New Version)
 * 
 * This script tests the Fortune Sound Club scraper by running it and displaying the results
 * without MongoDB integration for simple testing and debugging.
 */

const FortuneSoundClubScraper = require('./fortuneSoundClubScraper');

// === Testing Function ===
async function testScraper() {
  console.log('=== Testing Fortune Sound Club Scraper ===');
  
  // Initialize scraper with debugging options
  const scraper = new FortuneSoundClubScraper({
    debug: true,
    logEvents: true,
    saveHtml: true,
    saveScreenshots: true
  });
  
  console.log('Starting scraper...');
  
  // Run the scraper
  const events = await scraper.scrape();
  
  console.log(`\nFetched ${events.length} events`);
  
  if (events.length === 0) {
    console.log('No events found.');
    return;
  }
  
  // Display all events for inspection
  events.forEach((event, index) => {
    console.log(`\n--- Event ${index + 1} ---`);
    console.log(`Title: ${event.title}`);
    console.log(`Description: ${event.description || 'No description'}`);
    console.log(`Image URL: ${event.imageUrl || 'No image'}`);
    console.log(`Source URL: ${event.url}`);
    
    if (event.startDate) {
      console.log(`Date: ${event.startDate.toDateString()} ${event.startDate.toLocaleTimeString()}`);
    } else {
      console.log('Date: No date available');
    }
    
    if (event.usingDateFallback) {
      console.log('WARNING: Using fallback date!');
    }
  });
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total events: ${events.length}`);
  
  // Check for events using fallback
  const fallbackEvents = events.filter(e => e.usingDateFallback);
  console.log(`Events using fallbacks: ${fallbackEvents.length}`);
  
  if (fallbackEvents.length > 0) {
    console.log('⚠️ Some events are using fallback dates - check if date parsing can be improved');
  } else {
    console.log('✅ No events using fallbacks - good!');
  }
}

// Run the test
testScraper();
