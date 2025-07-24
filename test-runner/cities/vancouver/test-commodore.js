/**
 * Test script for Commodore Ballroom Events
 */

// Import the commodoreBallroomEvents module directly
const commodoreBallroomEvents = require('./commodoreBallroomEvents');

// Add debug logging
console.log('Testing test-commodore.js...');

async function testCommodore() {
  console.log('Testing Commodore Ballroom events scraper...');
  
  try {
    // Run the scraper directly
    const events = await commodoreBallroomEvents.scrape();
    
    console.log(`Total events found: ${events.length}`);
    
    // Display info about the first few events
    if (events.length > 0) {
      console.log("\nFirst 3 events:");
      events.slice(0, 3).forEach((event, i) => {
        console.log(`\nEvent ${i+1}: ${event.title}`);
        console.log(`Date: ${event.startDate} - ${event.endDate || 'No end date'}`);
        console.log(`URL: ${event.sourceUrl || 'No URL'}`);
        console.log(`Description: ${event.description ? event.description.substring(0, 100) + '...' : 'No description'}`);
      });
    } else {
      console.log("No events found.");
    }
  } catch (error) {
    console.error("Error testing scraper:", error);
    throw error;
  }
}

// Run the test
try {
  testCommodore();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}