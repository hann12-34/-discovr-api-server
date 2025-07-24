/**
 * Test Script for Gastown Sunday Set Scraper
 * 
 * This script runs the Gastown Sunday Set scraper and outputs the results
 */

const gastownScraper = require('./gastown-sunday-set-scraper');

async function testScraper() {
  console.log(`🔍 Testing ${gastownScraper.sourceIdentifier} scraper...`);
  
  try {
    // Run the scraper
    const events = await gastownScraper.scrape();
    
    // Display results
    console.log(`\n✅ Scraped ${events.length} events from ${gastownScraper.name}\n`);
    
    // Print first event details
    if (events.length > 0) {
      const firstEvent = events[0];
      console.log('📋 Sample Event Details:');
      console.log('------------------------------------------');
      console.log(`Title: ${firstEvent.title}`);
      console.log(`Date: ${firstEvent.startDate.toLocaleString()} - ${firstEvent.endDate.toLocaleString()}`);
      console.log(`Description: ${firstEvent.description.substring(0, 100)}...`);
      
      // Validate venue format
      if (typeof firstEvent.venue === 'object') {
        console.log(`Venue: ${firstEvent.venue.name} (${firstEvent.venue.address})`);
        console.log('✅ Venue is correctly formatted as an object');
      } else {
        console.error('❌ ERROR: Venue is not an object:', firstEvent.venue);
      }
      
      console.log('------------------------------------------');
    }
    
    // Print all events summary
    console.log('\n📆 All Generated Events:');
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} - ${event.startDate.toDateString()}`);
    });
    
    return events;
  } catch (error) {
    console.error(`❌ Error testing scraper: ${error.message}`);
    return [];
  }
}

// Run the test
testScraper().then(events => {
  // Display JSON format of first event for validation
  if (events.length > 0) {
    console.log('\n📝 First Event JSON Structure:');
    console.log(JSON.stringify(events[0], null, 2));
  }
});
