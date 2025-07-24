/**
 * Test script for the Rickshaw Theatre scraper
 */

const RickshawTheatreScraper = require('./rickshawTheatreScraper');

async function testRickshawScraper() {
  console.log('=== Testing Rickshaw Theatre Scraper ===');
  
  try {
    console.log('Starting scraper...');
    const events = await RickshawTheatreScraper.scrape();
    
    console.log(`\nFetched ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nFirst event details:');
      console.log(JSON.stringify(events[0], null, 2));
      
      console.log(`\nTotal events found: ${events.length}`);
      console.log('Event titles:');
      events.forEach((event, index) => {
        const date = event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Unknown date';
        console.log(`${index + 1}. ${event.title} - ${date}`);
      });
    } else {
      console.log('No events found.');
    }
    
  } catch (error) {
    console.error(`Error running Rickshaw Theatre scraper: ${error}`);
  }
}

testRickshawScraper().catch(console.error);
