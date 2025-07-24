/**
 * Test Runner for Fixed Rickshaw Theatre Scraper
 */

const RickshawTheatreScraperFixed = require('./rickshawTheatreScraperFixed');

async function testRickshawTheatreScraper() {
  console.log('=== Testing Fixed Rickshaw Theatre Scraper ===');
  console.log('Starting scraper...');
  
  try {
    const events = await RickshawTheatreScraperFixed.scrape();
    
    console.log(`\nFetched ${events.length} events`);
    
    if (events.length === 0) {
      console.log('No events found.');
      return;
    }
    
    // Display events
    events.forEach((event, index) => {
      console.log(`\n--- Event ${index + 1} ---`);
      console.log(`Title: ${event.title}`);
      console.log(`Date: ${event.startDate.toLocaleString()}`);
      console.log(`Description: ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}`);
      console.log(`Image URL: ${event.imageUrl || 'No image'}`);
      console.log(`Source URL: ${event.sourceUrl}`);
    });
    
    // Output some stats
    console.log('\n=== Summary ===');
    console.log(`Total events: ${events.length}`);
    
    // Find the earliest and latest events
    if (events.length > 0) {
      const sortedByDate = [...events].sort((a, b) => a.startDate - b.startDate);
      const earliest = sortedByDate[0];
      const latest = sortedByDate[sortedByDate.length - 1];
      
      console.log(`Earliest event: "${earliest.title}" on ${earliest.startDate.toLocaleDateString()}`);
      console.log(`Latest event: "${latest.title}" on ${latest.startDate.toLocaleDateString()}`);
    }
    
  } catch (error) {
    console.error(`Error running test: ${error.message}`);
  }
}

// Run the test
testRickshawTheatreScraper();
