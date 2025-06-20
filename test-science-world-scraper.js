const vancouverMuseumEvents = require('./scrapers/events/vancouverMuseumEvents');

async function testScienceWorldScraper() {
  console.log("Testing updated Science World scraper...");
  
  try {
    // Run the Science World scraper directly
    const events = await vancouverMuseumEvents.scrape();
    
    console.log(`Total events found: ${events.length}`);
    
    // Display info about the first few events
    if (events.length > 0) {
      console.log("\nFirst 3 events:");
      events.slice(0, 3).forEach((event, i) => {
        console.log(`\nEvent ${i+1}: ${event.title}`);
        console.log(`Date: ${event.startDate} - ${event.endDate || 'No end date'}`);
        console.log(`URL: ${event.sourceURL}`);
        console.log(`Description: ${event.description.substring(0, 100)}...`);
      });
    }
  } catch (error) {
    console.error("Error testing scraper:", error);
  }
}

testScienceWorldScraper();
