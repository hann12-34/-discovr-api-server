/**
 * Test script for Shipyards Night Market scraper
 */

// Import the scraper
const shipyardsNightMarketScraper = require('./cities/vancouver/shipyardsNightMarket');

/**
 * Test the Shipyards Night Market scraper
 */
async function testShipyardsNightMarketScraper() {
  console.log('🔍 Testing Shipyards Night Market scraper...');
  
  // Run the scraper
  const events = await shipyardsNightMarketScraper.scrape();
  
  console.log(`\n✅ Scraped ${events.length} events from Shipyards Night Market\n`);
  
  if (events.length === 0) {
    console.log('⚠️ No events were returned from the scraper');
    return;
  }
  
  // Print sample events
  console.log('📋 Sample Events:');
  for (let i = 0; i < Math.min(3, events.length); i++) {
    const event = events[i];
    console.log('------------------------------------------');
    console.log(`Event ${i + 1}: ${event.title}`);
    console.log(`Date: ${event.startDate.toLocaleString()} - ${event.endDate.toLocaleString()}`);
    console.log(`Venue: ${event.venue.name}`);
    console.log(`Description: ${event.description.substring(0, 100)}...`);
    console.log(`Categories: ${event.categories.join(', ')}`);
    console.log('------------------------------------------');
  }
  
  // Validate venue objects
  console.log('\n📍 Validating venue objects...\n');
  let validVenueCount = 0;
  let invalidVenueCount = 0;
  
  for (const event of events) {
    if (event.venue && 
        typeof event.venue === 'object' && 
        event.venue.name && 
        event.venue.coordinates &&
        event.venue.address) {
      validVenueCount++;
    } else {
      invalidVenueCount++;
      console.log(`❌ Invalid venue in event: ${event.title}`);
    }
  }
  
  console.log(`✅ Events with valid venue objects: ${validVenueCount}`);
  console.log(`❌ Events with invalid venue format: ${invalidVenueCount}`);
}

// Run the test
testShipyardsNightMarketScraper();
