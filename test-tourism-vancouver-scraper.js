/**
 * Test script for the Tourism Vancouver events scraper
 * This script runs the scraper and logs the extracted events
 */

const tourismVancouverEvents = require('./scrapers/cities/vancouver/tourismVancouverEvents');

async function testTourismVancouverScraper() {
  console.log('Starting test of Tourism Vancouver events scraper...');
  
  try {
    // Run the scraper
    const events = await tourismVancouverEvents.scrape();
    
    // Log the number of events found
    console.log(`Total events found: ${events.length}`);
    
    // Log event details
    if (events.length > 0) {
      console.log('\n--- Events Details ---');
      events.forEach((event, index) => {
        console.log(`\nEvent ${index + 1}: ${event.title}`);
        console.log(`Date: ${event.startDate ? event.startDate.toLocaleDateString() : 'N/A'} - ${event.endDate ? event.endDate.toLocaleDateString() : 'N/A'}`);
        console.log(`Venue: ${event.venue ? event.venue.name : 'N/A'}`);
        console.log(`Categories: ${event.categories.join(', ')}`);
        console.log(`URL: ${event.officialWebsite}`);
        console.log('-'.repeat(40));
      });
    } else {
      console.log('No events were found. The scraper might need to be adjusted based on the current website structure.');
    }
  } catch (error) {
    console.error('Error running the scraper:', error);
  }
}

// Run the test
testTourismVancouverScraper();
