const commodoreScraper = require('./scrapers/venues/commodoreBallroomShows');

async function testScrapers() {
  try {
    console.log('Starting Commodore Ballroom scraper test...');
    
    // Test the scraper with default parameters
    const events = await commodoreScraper.scrape();
    
    console.log(`\nFound ${events.length} events:`);
    events.forEach((event, index) => {
      console.log(`\nEvent ${index + 1}:`);
      console.log(`Title: ${event.title}`);
      console.log(`Date: ${event.startDate}`);
      console.log(`Venue: ${event.venue.name}`);
      console.log(`Location: ${event.location.city}, ${event.location.state}`);
    });
    
    console.log('\nScraper test completed successfully!');
  } catch (error) {
    console.error('Error testing scraper:', error);
  }
}

testScrapers();
