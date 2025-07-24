/**
 * Test script for Fox Cabaret Calendar
 */

const foxCabaretEvents = require('./foxCabaretEvents');

// Add debug logging
console.log('Testing test-fox-cabaret-calendar.js...');

async function testFoxCabaretCalendar() {
  console.log('Testing Fox Cabaret Calendar scraper...');
  
  try {
    // Run the Fox Cabaret scraper directly
    const events = await foxCabaretEvents.scrape();
    
    console.log(`Total events found: ${events.length}`);
    
    // Display info about the first few events
    if (events.length > 0) {
      console.log("\nFirst 3 events:");
      events.slice(0, 3).forEach((event, i) => {
        console.log(`\nEvent ${i+1}: ${event.title}`);
        console.log(`URL: ${event.sourceUrl || 'No URL'}`);
        console.log(`Description: ${event.description ? event.description.substring(0, 100) + '...' : 'No description'}`);
      });
    } else {
      console.log("No events found. The scraper completed successfully but the website may have changed structure or has no events listed.");
    }
  } catch (error) {
    console.error("Error testing scraper:", error);
    throw error;
  }
}

// Run the test
try {
  testFoxCabaretCalendar();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}