/**
 * Test Script for PNE Summer Night Concerts Scraper
 * 
 * This script runs the PNE Summer Night Concerts scraper and verifies its output
 */

// Import the scraper
const pneSummerNightConcerts = require('./pneSummerNightConcerts');

// Add debug logging
console.log(`Testing test-pne-concerts-scraper.js...`);


async function testPNESummerNightConcertsScraper() {
  console.log('🔍 Testing PNE Summer Night Concerts scraper...');
  
  try {
    // Run the scraper
    const events = await pneSummerNightConcerts.scrape();
    
    // Check if events were found
    if (events.length === 0) {
      console.error('❌ No events found by the scraper');
      return;
    }
    
    console.log(`\n✅ Scraped ${events.length} events from PNE Summer Night Concerts series\n`);
    
    // Show sample of events (first 3)
    console.log('📋 Sample Events:');
    const sampleEvents = events.slice(0, 3);
    
    for (let i = 0; i < sampleEvents.length; i++) {
      const event = sampleEvents[i];
      console.log('------------------------------------------');
      console.log(`Event ${i+1}: ${event.title}`);
      console.log(`Date: ${event.startDate.toLocaleDateString()}, ${event.startDate.toLocaleTimeString()} - ${event.endDate.toLocaleTimeString()}`);
      console.log(`Venue: ${event.venue.name}`);
      
      // Truncate description if too long
      const shortDescription = event.description.length > 100 
        ? event.description.substring(0, 100) + '...' 
        : event.description;
      console.log(`Description: ${shortDescription}`);
      
      console.log(`Categories: ${event.categories.join(', ')}`);
      console.log(`Tickets URL: ${event.ticketsUrl || 'N/A'}`);
      console.log('------------------------------------------');
    }
    
    // Validate venue objects
    console.log('\n📍 Validating venue objects...');
    
    const validEvents = events.filter(event => 
      event.venue && 
      typeof event.venue === 'object' &&
      event.venue.name &&
      event.venue.coordinates &&
      typeof event.venue.coordinates === 'object' &&
      'lat' in event.venue.coordinates &&
      'lng' in event.venue.coordinates
    );
    
    console.log(`\n✅ Events with valid venue objects: ${validEvents.length}`);
    console.log(`❌ Events with invalid venue format: ${events.length - validEvents.length}`);
    
  } catch (error) {
    console.error(`❌ Error testing PNE Summer Night Concerts scraper: ${error.message}`);
    console.error(error);
  }
}

// Run the test
try {
  testPNESummerNightConcertsScraper();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
