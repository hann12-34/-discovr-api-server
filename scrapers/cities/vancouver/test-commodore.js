/**
 * Test script for Commodore Ballroom scraper
 */

const commodoreScraper = require('./scrapers/venues/commodoreBallroomShows');
const { scrapeLogger } = require('./scrapers/utils/logger');

async function testCommodoreScraper() {
  try {
    console.log('Starting Commodore Ballroom test scraper...');
    const events = await commodoreScraper.scrape();
    
    console.log(`Found ${events ? events.length : 0} events!`);
    
    if (events && events.length > 0) {
      console.log('\nSample events:');
      events.slice(0, 5).forEach((event, i) => {
        console.log(`\nEVENT ${i+1}: ${event.title}`);
        console.log(`Date: ${event.startDate}`);
        console.log(`URL: ${event.url}`);
        console.log(`Image: ${event.image}`);
      });
    }
    
    return events;
  } catch (error) {
    console.error('Error testing Commodore scraper:', error);
    return [];
  }
}

// Run the test
testCommodoreScraper();
