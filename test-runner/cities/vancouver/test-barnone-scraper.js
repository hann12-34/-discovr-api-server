/**
 * Test Bar None Club Scraper
 * 
 * This script runs the Bar None Club scraper to validate its functionality
 * and checks that venue is formatted correctly as an object
 */

const barNoneScraper = require('./barNoneClub');

// Add debug logging
console.log(`Testing test-barnone-scraper.js...`);


async function testBarNoneScraper() {
  console.log('🔍 Testing Bar None Club scraper...');
  
  try {
    // Run the scraper
    const events = await barNoneScraper.scrape();
    
    console.log(`\n✅ Scraped ${events.length} events from Bar None Club`);
    
    // Check for venue object formatting issues
    let validVenueObjects = 0;
    let invalidVenueFormats = 0;
    
    // Display a sample of events
    console.log('\n📋 Sample Events:');
    for (let i = 0; i < Math.min(3, events.length); i++) {
      const event = events[i];
      
      // Check venue format
      if (typeof event.venue === 'object' && event.venue !== null && 
          'name' in event.venue && 'address' in event.venue) {
        validVenueObjects++;
      } else {
        invalidVenueFormats++;
      }
      
      // Display event info
      console.log('------------------------------------------');
      console.log(`Event ${i+1}: ${event.title}`);
      console.log(`Date: ${event.startDate.toLocaleString()}`);
      console.log(`Venue: ${event.venue.name}`);
      
      // Show truncated description
      const shortDesc = event.description.length > 100 ? 
                     event.description.substring(0, 100) + '...' : 
                     event.description;
      console.log(`Description: ${shortDesc}`);
      
      // Show category
      console.log(`Category: ${event.category}`);
      console.log('------------------------------------------');
    }
    
    // Summary of venue format check
    console.log(`\n✅ Events with valid venue objects: ${validVenueObjects}`);
    console.log(`❌ Events with invalid venue format: ${invalidVenueFormats}`);
    
    // Display JSON structure of first event
    if (events.length > 0) {
      console.log('\n📝 First Event JSON Structure:');
      console.log(JSON.stringify(events[0], null, 2));
    }
    
  } catch (error) {
    console.error(`❌ Error testing scraper: ${error.message}`);
    console.error(error);
  }
}

// Run the test
try {
  testBarNoneScraper();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
