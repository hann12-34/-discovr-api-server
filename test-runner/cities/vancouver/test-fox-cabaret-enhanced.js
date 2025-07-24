/**
 * Test Runner for Fox Cabaret Enhanced Scraper
 */

const FoxCabaretScraper = require('./foxCabaretScraperEnhanced');

async function testFoxCabaretScraper() {
  console.log('=== Testing Fox Cabaret Enhanced Scraper ===');
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
      console.log(`Date: ${event.startDate ? event.startDate.toLocaleString() : 'No date'}`);
      console.log(`Description: ${event.description ? (event.description.substring(0, 100) + (event.description.length > 100 ? '...' : '')) : 'No description'}`);
      console.log(`Image URL: ${event.imageUrl || 'No image'}`);
      console.log(`Source URL: ${event.sourceUrl}`);
      
      // Verify no fallbacks are used
      if (event.isFallback) {
        console.error(`ERROR: Event "${event.title}" is using fallback data!`);
      }
    });
    
    // Output some stats
    console.log('\n=== Summary ===');
    console.log(`Total events: ${events.length}`);
    
    // Find the earliest and latest events
    if (events.length > 0) {
      const sortedByDate = [...events].sort((a, b) => a.startDate - b.startDate);
      const earliest = sortedByDate[0];
      const latest = sortedByDate[sortedByDate.length - 1];
      
      if (earliest.startDate) {
        console.log(`Earliest event: "${earliest.title}" on ${earliest.startDate.toLocaleDateString()}`);
      }
      
      if (latest.startDate) {
        console.log(`Latest event: "${latest.title}" on ${latest.startDate.toLocaleDateString()}`);
      }
    }
    
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
