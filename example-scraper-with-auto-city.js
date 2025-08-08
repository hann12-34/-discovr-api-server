/**
 * EXAMPLE SCRAPER WITH AUTOMATIC CITY DETECTION
 * Shows how ANY scraper can automatically detect its city
 * and ensure proper venue.name for app visibility
 */

const { processBatchWithCity } = require('./utils/auto-detect-city');

// Example scraper for ANY city
class ExampleScraper {
  async scrapeEvents() {
    // Simulate scraping some events
    const rawEvents = [
      {
        title: "Concert at Main Venue",
        startDate: "2025-08-15T20:00:00Z",
        venue: "Main Concert Hall"  // Just a string - will be auto-converted
      },
      {
        title: "Art Exhibition", 
        startDate: "2025-08-20T18:00:00Z",
        venue: { name: "Art Gallery" }  // Already an object - will get city added
      },
      {
        title: "Food Festival",
        startDate: "2025-08-25T12:00:00Z",
        location: "Downtown Park, Some Street",  // No venue - will extract from location
        venue: null
      }
    ];

    // 🎯 MAGIC: Automatic city detection and venue.name enforcement
    // Just pass __filename and the utility does everything!
    const eventsWithProperVenueNames = processBatchWithCity(rawEvents, __filename);

    return eventsWithProperVenueNames;
  }
}

// Test the auto-detection
async function testAutoDetection() {
  console.log('🧪 TESTING AUTOMATIC CITY DETECTION...\n');
  
  const scraper = new ExampleScraper();
  const events = await scraper.scrapeEvents();
  
  console.log('\n📋 PROCESSED EVENTS:');
  events.forEach((event, i) => {
    console.log(`${i + 1}. "${event.title}"`);
    console.log(`   venue.name: "${event.venue.name}"`);
    console.log('');
  });
  
  console.log('🎯 BENEFITS:');
  console.log('✅ City automatically detected from folder path');
  console.log('✅ All events have proper venue.name structure');
  console.log('✅ All events will be visible in app city filtering');
  console.log('✅ NO manual configuration needed per scraper');
  console.log('✅ NO events lost due to missing venue.name');
}

// Run the test if called directly
if (require.main === module) {
  testAutoDetection();
}

module.exports = ExampleScraper;
