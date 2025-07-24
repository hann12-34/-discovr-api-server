/**
 * Test script for HelloBC scrapers
 * This script tests both HelloBC Events scrapers to ensure they're working properly
 */

// Import the scrapers
const helloBCEvents = require('./scrapers/cities/vancouver/helloBCEvents');
const helloBCEventsAdditional = require('./scrapers/cities/vancouver/helloBCEventsAdditional');

async function testScrapers() {
  console.log('🧪 Testing HelloBC Events scrapers...\n');
  
  // Test the original HelloBC Events scraper
  console.log('🔍 Testing original HelloBC Events scraper...');
  const events1 = await helloBCEvents.scrape();
  console.log(`✅ Original HelloBC Events scraper returned ${events1.length} events.`);
  
  // List all events from the original scraper
  console.log('\n📋 Events from original HelloBC Events scraper:');
  events1.forEach((event, index) => {
    console.log(`${index + 1}. ${event.title} - ${event.startDate.toLocaleDateString()}`);
  });
  
  // Test the additional HelloBC Events scraper
  console.log('\n\n🔍 Testing HelloBC Additional Events scraper...');
  const events2 = await helloBCEventsAdditional.scrape();
  console.log(`✅ HelloBC Additional Events scraper returned ${events2.length} events.`);
  
  // List all events from the additional scraper
  console.log('\n📋 Events from HelloBC Additional Events scraper:');
  events2.forEach((event, index) => {
    console.log(`${index + 1}. ${event.title} - ${event.startDate.toLocaleDateString()}`);
  });
  
  // Combine all events
  const allEvents = [...events1, ...events2];
  console.log(`\n\n🎉 Total HelloBC Events: ${allEvents.length}`);
  
  // Verify there are no duplicate events
  const eventTitles = allEvents.map(e => e.title);
  const uniqueTitles = new Set(eventTitles);
  if (uniqueTitles.size === allEvents.length) {
    console.log('✅ No duplicate events found!');
  } else {
    console.log('❌ Warning: Possible duplicate events detected.');
    console.log(`Events: ${allEvents.length}, Unique titles: ${uniqueTitles.size}`);
  }
}

// Run the test
testScrapers().catch(error => {
  console.error('❌ Test failed:', error);
});
