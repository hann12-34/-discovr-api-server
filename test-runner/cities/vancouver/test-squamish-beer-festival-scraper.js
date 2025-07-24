/**
 * Test script for Squamish Beer Festival scraper
 */

const squamishBeerFestival = require('./squamishBeerFestival');

// Add debug logging
console.log(`Testing test-squamish-beer-festival-scraper.js...`);


async function testSquamishBeerFestivalScraper() {
  console.log('🔍 Testing Squamish Beer Festival scraper...');
  
  try {
    // Run the scraper
    const events = await squamishBeerFestival.scrape();
    
    // Check if events were returned
    console.log(`\n✅ Scraped ${events.length} events from Squamish Beer Festival 2025\n`);
    
    if (events.length === 0) {
      console.log('⚠️ No events were returned from the scraper');
      return;
    }
    
    // Print sample events (up to 3)
    console.log('📋 Sample Events:');
    const sampleEvents = events.slice(0, Math.min(3, events.length));
    sampleEvents.forEach((event, index) => {
      console.log('------------------------------------------');
      console.log(`Event ${index + 1}: ${event.title}`);
      console.log(`Date: ${event.startDate.toLocaleString()} - ${event.endDate.toLocaleString()}`);
      console.log(`Venue: ${event.venue.name}`);
      // Truncate description if too long
      const maxLength = 100;
      const description = event.description.length > maxLength 
        ? `${event.description.substring(0, maxLength)}...`
        : event.description;
      console.log(`Description: ${description}`);
      console.log(`Categories: ${event.categories.join(', ')}`);
      console.log(`Tickets URL: ${event.ticketsUrl || 'N/A'}`);
      console.log('------------------------------------------');
    });
    
    // Validate venue objects
    console.log('\n📍 Validating venue objects...\n');
    let validVenueCount = 0;
    let invalidVenueCount = 0;
    
    events.forEach(event => {
      // Check if venue is an object with required properties
      const hasValidVenue = event.venue && 
                          typeof event.venue === 'object' &&
                          event.venue.name &&
                          event.venue.address &&
                          event.venue.city &&
                          event.venue.coordinates &&
                          typeof event.venue.coordinates === 'object' &&
                          typeof event.venue.coordinates.lat === 'number' &&
                          typeof event.venue.coordinates.lng === 'number';
      
      if (hasValidVenue) {
        validVenueCount++;
      } else {
        invalidVenueCount++;
        console.log(`❌ Invalid venue format in event: ${event.title}`);
      }
    });
    
    console.log(`✅ Events with valid venue objects: ${validVenueCount}`);
    console.log(`❌ Events with invalid venue format: ${invalidVenueCount}`);
  
  } catch (error) {
    console.error(`❌ Error testing scraper: ${error.message}`);
    console.error(error);
  }
}

// Run the test
try {
  testSquamishBeerFestivalScraper();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
