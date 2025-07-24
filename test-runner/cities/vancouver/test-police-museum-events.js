/**
 * Test script for Vancouver Police Museum Events scraper
 * 
 * This script runs the Vancouver Police Museum Events scraper and outputs the results
 */

const PoliceMuseumEvents = require('./policeMuseumEvents');

/**
 * Test the Vancouver Police Museum Events scraper
 */
async function testPoliceMuseumEvents() {
  try {
    console.log('🧪 Testing Vancouver Police Museum Events scraper...');
    
    // Create a new instance of the scraper
    const scraper = new PoliceMuseumEvents();
    
    // Scrape events
    const events = await scraper.scrape();
    
    // Output the results
    console.log('📊 Results:');
    console.log(`Found ${events.length} events`);
    
    // Display each event
    events.forEach((event, index) => {
      console.log(`\n📅 Event #${index + 1}:`);
      console.log(`Title: ${event.title}`);
      console.log(`Description: ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}`);
      console.log(`Start Date: ${event.startDate.toISOString()}`);
      console.log(`End Date: ${event.endDate ? event.endDate.toISOString() : 'N/A'}`);
      console.log(`Venue: ${event.venue.name}`);
      console.log(`URL: ${event.url}`);
      console.log(`Unique ID: ${event.uniqueId}`);
      console.log(`Image URL: ${event.imageUrl || 'N/A'}`);
    });
    
    console.log('\n✅ Test completed successfully');
    return events;
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
    return [];
  }
}

// Run the test
testPoliceMuseumEvents();
