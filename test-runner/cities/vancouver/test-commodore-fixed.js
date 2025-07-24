/**
 * Test script for the fixed Commodore Ballroom scraper
 */

const CommodoreBallroomEvents = require('./commodoreBallroomEvents');

// Add debug logging
console.log(`Testing test-commodore-fixed.js...`);


async function testCommodoreScraper() {
  console.log('Testing Commodore Ballroom scraper with fixed venue ID...');
  
  try {
    const events = await CommodoreBallroomEvents.scrape();
    
    if (events && events.length > 0) {
      console.log(`✅ Successfully scraped ${events.length} events from Commodore Ballroom`);
      
      // Display the first 10 events
      console.log('\nSample of events:');
      events.slice(0, 10).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.startDate).toLocaleDateString()}`);
        console.log(`Venue: ${event.venue}`);
        console.log(`URL: ${event.url}`);
      });
    } else {
      console.log('❌ No events found or scraping failed');
    }
  } catch (error) {
    console.error('❌ Error testing Commodore Ballroom scraper:', error);
  }
}

try {
  testCommodoreScraper();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
