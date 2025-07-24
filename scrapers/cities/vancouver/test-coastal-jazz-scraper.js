/**
 * Test script for Coastal Jazz Festival Events scraper
 */

const coastalJazzEvents = require('./scrapers/cities/vancouver/coastalJazzEvents');

async function testScraper() {
  console.log('Starting Coastal Jazz Festival Events scraper test...');
  
  try {
    const events = await coastalJazzEvents.scrape();
    
    console.log(`\nSuccessfully found ${events.length} events`);
    
    // Output the first event as an example
    if (events.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
    }
  } catch (error) {
    console.error('Error testing scraper:', error);
  }
}

// Run the test
testScraper();
