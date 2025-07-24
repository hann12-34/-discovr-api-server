/**
 * Test Rogers Arena Scraper Adapter
 * 
 * This script tests the Rogers Arena scraper adapter to ensure it works
 * as expected before running it through the main import system.
 */
const rogersArenaScraper = require('./scrapers/cities/vancouver/rogersArenaScraperAdapter');

async function testRogersArenaScraper() {
  console.log('Testing Rogers Arena scraper adapter...');
  try {
    console.time('Scraping completed in');
    
    // Run the scraper
    const events = await rogersArenaScraper.scrape();
    
    console.timeEnd('Scraping completed in');
    
    // Output the results
    console.log(`Found ${events.length} events from Rogers Arena`);
    
    if (events.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
    }
    
    console.log('\nAll event titles:');
    events.forEach(event => {
      console.log(`- ${event.title} (${event.date})`);
    });
  } catch (error) {
    console.error('Error testing Rogers Arena scraper:', error);
  }
}

// Run the test
testRogersArenaScraper();
