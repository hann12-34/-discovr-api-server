/**
 * Test Runner for Fox Cabaret Final Scraper - No Date Range Summary
 */

const FoxCabaretScraper = require('./foxCabaretScraperFinal');

async function testFoxCabaretScraper() {
  console.log('=== Testing Fox Cabaret Final Scraper ===');
  console.log('Starting scraper...');
  
  try {
    const events = await FoxCabaretScraper.scrape();
    
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
    });
    
    // Output simple summary without date range information
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
testFoxCabaretScraper();
