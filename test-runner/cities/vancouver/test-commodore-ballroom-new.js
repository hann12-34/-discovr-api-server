/**
 * Test Runner for Commodore Ballroom Scraper
 */

const CommodoreBallroomScraper = require('./commodoreBallroomScraper');

async function testCommodoreBallroomScraper() {
  console.log('=== Testing Commodore Ballroom Scraper ===');
  console.log('Starting scraper...');
  
  try {
    const events = await CommodoreBallroomScraper.scrape();
    
    console.log(`\nFetched ${events.length} events`);
    
    if (events.length === 0) {
      console.log('No events found.');
      return;
    }
    
    // Display events
    events.forEach((event, index) => {
      console.log(`\n--- Event ${index + 1} ---`);
      console.log(`Title: ${event.title}`);
      console.log(`Description: ${event.description ? (event.description.substring(0, 100) + (event.description.length > 100 ? '...' : '')) : 'No description'}`);
      console.log(`Image URL: ${event.imageUrl || 'No image'}`);
      console.log(`Source URL: ${event.sourceUrl}`);
      if (event.ticketUrl && event.ticketUrl !== event.sourceUrl) {
        console.log(`Ticket URL: ${event.ticketUrl}`);
      }
    });
    
    // Output simple summary
    console.log('\n=== Summary ===');
    console.log(`Total events: ${events.length}`);
    
    // Verify that NONE of the events use fallbacks
    const fallbackEvents = events.filter(event => event.isFallback);
    console.log(`\nEvents using fallbacks: ${fallbackEvents.length}`);
    if (fallbackEvents.length > 0) {
      console.error('WARNING: Some events are using fallback data!');
    } else {
      console.log('✅ No events using fallbacks - good!');
    }
    
  } catch (error) {
    console.error(`Error running test: ${error.message}`);
  }
}

// Run the test
testCommodoreBallroomScraper();
