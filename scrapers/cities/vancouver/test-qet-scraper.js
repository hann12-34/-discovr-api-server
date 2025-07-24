/**
 * Test Script for Queen Elizabeth Theatre Scraper
 * 
 * This script runs the Queen Elizabeth Theatre scraper and validates its output
 */

const qetScraper = require('./cities/vancouver/queenElizabethTheatre');

async function testQueenElizabethTheatreScraper() {
  console.log('🔍 Testing Queen Elizabeth Theatre scraper...');
  
  try {
    // Run the scraper
    const events = await qetScraper.scrape();
    
    console.log(`\n✅ Scraped ${events.length} events from Queen Elizabeth Theatre\n`);
    
    // Check if we have events
    if (events.length === 0) {
      console.error('❌ No events were scraped');
      return;
    }
    
    // Print sample events
    console.log('📋 Sample Events:');
    for (let i = 0; i < Math.min(3, events.length); i++) {
      const event = events[i];
      console.log('------------------------------------------');
      console.log(`Event ${i+1}: ${event.title}`);
      console.log(`Date: ${new Date(event.startDate).toLocaleString()}`);
      console.log(`Venue: ${event.venue.name}`);
      console.log(`Description: ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}`);
      console.log(`Category: ${event.category}`);
      console.log('------------------------------------------');
    }
    
    // Validate venue objects
    console.log('\n📍 Validating venue objects...');
    let validVenues = 0;
    let invalidVenues = 0;
    
    for (const event of events) {
      if (event.venue && 
          typeof event.venue === 'object' && 
          event.venue.name && 
          event.venue.coordinates &&
          event.venue.coordinates.lat && 
          event.venue.coordinates.lng) {
        validVenues++;
      } else {
        invalidVenues++;
        console.error(`❌ Invalid venue format for event: ${event.title}`);
      }
    }
    
    console.log(`\n✅ Events with valid venue objects: ${validVenues}`);
    console.log(`❌ Events with invalid venue format: ${invalidVenues}`);
    
    // Print structure of first event
    console.log('\n📝 First Event JSON Structure:');
    console.log(JSON.stringify(events[0], null, 2));
    
  } catch (error) {
    console.error(`❌ Error testing scraper: ${error.message}`);
    console.error(error);
  }
}

// Run the test
testQueenElizabethTheatreScraper();
