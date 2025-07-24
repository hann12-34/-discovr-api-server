/**
 * Test script for the fixed Orpheum Theatre scraper
 */

const OrpheumTheatreEvents = require('./orpheumTheatreEvents.fixed');

async function testOrpheumScraper() {
  console.log('=== Testing Fixed Orpheum Theatre Scraper ===');
  
  try {
    console.log('Starting scraper...');
    const events = await OrpheumTheatreEvents.scrape();
    
    console.log(`\nFetched ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nFirst event details:');
      console.log(JSON.stringify(events[0], null, 2));
    } else {
      console.log('No events found. Check debug logs and screenshots.');
    }
    
  } catch (error) {
    console.error(`Error running Orpheum scraper: ${error}`);
  }
}

testOrpheumScraper().catch(console.error);
