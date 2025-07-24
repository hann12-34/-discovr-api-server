/**
 * Test script for the LiveNation-based Orpheum Theatre scraper
 */

const OrpheumLiveNationScraper = require('./orpheumLiveNationScraper');

async function testOrpheumScraper() {
  console.log('=== Testing Orpheum Theatre LiveNation Scraper ===');
  
  try {
    console.log('Starting scraper...');
    const events = await OrpheumLiveNationScraper.scrape();
    
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
      console.log('No events found. Check debug logs and screenshots.');
    }
    
  } catch (error) {
    console.error(`Error running Orpheum LiveNation scraper: ${error}`);
  }
}

testOrpheumScraper().catch(console.error);
