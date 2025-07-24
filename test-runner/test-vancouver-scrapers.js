/**
 * Test Runner for Vancouver Event Scrapers
 * Runs individual or all Vancouver event scrapers to verify they work correctly
 */

const VancouverEventManager = require('../restored-scrapers/cities/vancouver/vancouverEventManager');

// Parse command line arguments
const args = process.argv.slice(2);
const scraperName = args[0]; // Optional scraper name

async function runTests() {
  console.log('=== Vancouver Event Scrapers Test Runner ===');
  
  const eventManager = new VancouverEventManager();
  
  // If a specific scraper name is provided, run just that one
  if (scraperName) {
    console.log(`Testing specific scraper: ${scraperName}`);
    
    try {
      const events = await eventManager.runScraper(scraperName);
      if (events.length > 0) {
        console.log(`\n✅ SUCCESS: ${scraperName} returned ${events.length} events`);
        
        // Display first event as sample
        console.log('\nSample event:');
        console.log(JSON.stringify(events[0], null, 2));
      } else {
        console.log(`\n⚠️ WARNING: ${scraperName} returned 0 events`);
      }
    } catch (error) {
      console.error(`\n❌ FAILED: ${scraperName} - ${error.message}`);
    }
  } 
  // Otherwise run all scrapers
  else {
    console.log('Testing all Vancouver scrapers...');
    
    try {
      const allEvents = await eventManager.runAll();
      
      console.log(`\n=== Results Summary ===`);
      console.log(`Total unique events: ${allEvents.length}`);
      
      // Group events by source/venue
      const eventsBySource = {};
      
      allEvents.forEach(event => {
        const venue = event.venue;
        if (!eventsBySource[venue]) {
          eventsBySource[venue] = [];
        }
        eventsBySource[venue].push(event);
      });
      
      // Display counts by venue
      console.log('\nEvents per venue:');
      Object.entries(eventsBySource).forEach(([venue, events]) => {
        console.log(`- ${venue}: ${events.length} events`);
      });
      
    } catch (error) {
      console.error(`\n❌ ERROR running scrapers: ${error.message}`);
    }
  }
}

// Run the tests
runTests().catch(console.error);
