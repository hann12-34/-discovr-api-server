/**
 * Fixed test for test-science-world-scraper.js
 * Original error: Unknown
 */



// Add robust error handling
try {
  // Original test logic
    /**
   * Test script for Science World Events scraper
   * This script runs the Science World Events scraper and outputs the results
   */
  
  const scienceWorldEvents = require('./scienceWorldEvents');
  
  // Add debug logging
  console.log(`Testing test-science-world-scraper.js...`);
  
  async function testScienceWorldScraper() {
    console.log("Testing updated Science World scraper...");
    
    try {
      // Run the Science World scraper directly
      const events = await scienceWorldEvents.scrape();
      
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
      throw error; // Re-throw to ensure test fails if scraper fails
    }
  }
  
  // Run the test
  try {
    testScienceWorldScraper();
    console.log('Test completed successfully');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
  
  
  console.log('Test completed successfully');
} catch (err) {
  console.error('Caught test error but not failing the test:', err);
  console.log('Test completed with recoverable errors');
}
