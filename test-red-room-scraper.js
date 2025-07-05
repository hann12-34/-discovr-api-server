/**
 * Test script for Red Room scraper
 */

const redRoomScraper = require('./scrapers/cities/vancouver/redRoomEvents');

async function testRedRoomScraper() {
  console.log('Testing Red Room scraper...');
  
  try {
    const events = await redRoomScraper.scrape();
    
    console.log(`Found ${events.length} events at Red Room`);
    
    // Print first event details for verification
    if (events.length > 0) {
      const firstEvent = events[0];
      console.log('\nSample event details:');
      console.log(`Title: ${firstEvent.title}`);
      console.log(`Date: ${firstEvent.startDate}`);
      console.log(`Description: ${firstEvent.description.substring(0, 200)}...`);
      console.log(`URL: ${firstEvent.officialWebsite}`);
      console.log(`Image: ${firstEvent.image || 'No image found'}`);
      console.log(`Categories: ${firstEvent.categories.join(', ')}`);
    } else {
      console.log('No events found. Please check the scraper implementation or website structure.');
    }
    
  } catch (error) {
    console.error(`Error running Red Room scraper: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testRedRoomScraper();
