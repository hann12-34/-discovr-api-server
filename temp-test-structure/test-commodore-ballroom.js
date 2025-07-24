/**
 * Test script for Commodore Ballroom Events scraper
 */

const CommodoreBallroomEvents = require('../commodoreBallroomEvents');

async function testScraper() {
  console.log('Starting Commodore Ballroom Events scraper test...');
  
  try {
    const events = await CommodoreBallroomEvents.scrape();
    
    console.log(`Found ${events.length} events:`);
    events.forEach((event, index) => {
      console.log(`\nEvent ${index + 1}:`);
      console.log(`Title: ${event.title}`);
      console.log(`Date: ${event.startDate}`);
      console.log(`URL: ${event.url}`);
      console.log(`Image: ${event.imageUrl}`);
      console.log(`Venue: ${event.venue}`);
      console.log(`Slug: ${event.slug}`);
    });
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testScraper();
