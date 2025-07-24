/**
 * Test script for integrating Museum of Vancouver scraper with main system
 */
const scraperSystem = require('./scrapers');

async function testMOVIntegration() {
  try {
    console.log("Testing Museum of Vancouver scraper integration...");
    
    // Run the Vancouver Museum Events scraper specifically
    const events = await scraperSystem.runScraper("Vancouver Museum Events");
    
    console.log(`Found ${events.length} events from Museum of Vancouver`);
    
    if (events.length > 0) {
      // Display a sample event
      const sample = events[0];
      console.log("\nSample event:");
      console.log(`Title: ${sample.title}`);
      console.log(`Date: ${sample.startDate}`);
      console.log(`Source: ${sample.source}`);
      
      // Save events to the database
      console.log("Saving events to database...");
      const saveResult = await scraperSystem.saveEvents(events, "Vancouver Museum Events");
      console.log("Save result:", saveResult);
    }
  } catch (error) {
    console.error("Error testing MOV integration:", error);
  }
}

// Run the test
testMOVIntegration();
