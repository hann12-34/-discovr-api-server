/**
 * Test script for Beaty Biodiversity Museum Events scraper
 * 
 * This script runs the Beaty Biodiversity Museum Events scraper and outputs the results
 */

const BeatyBiodiversityMuseumEvents = require('./beatyBiodiversityMuseumEvents');

/**
 * Test the Beaty Biodiversity Museum Events scraper
 */
async function testBeatyBiodiversityMuseumEvents() {
  try {
    console.log('🧪 Testing Beaty Biodiversity Museum Events scraper...');
    
    // Create a new instance of the scraper
    const scraper = new BeatyBiodiversityMuseumEvents();
    
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
testBeatyBiodiversityMuseumEvents();
