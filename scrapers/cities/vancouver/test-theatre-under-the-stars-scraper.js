/**
 * Test script for the Theatre Under the Stars (TUTS) scraper
 * 
 * This script tests the Theatre Under the Stars scraper and prints sample events
 */

const theatreUnderTheStars = require('./cities/vancouver/theatreUnderTheStars');

async function testScraper() {
  console.log('🧪 Testing Theatre Under the Stars scraper...');
  
  try {
    // Run the scraper
    const events = await theatreUnderTheStars.scrape();
    
    // Check if events were found
    if (events && events.length > 0) {
      console.log(`✅ Success! Found ${events.length} events`);
      
      // Print venue details
      console.log('\n📍 Venue details:');
      console.log(JSON.stringify(events[0].venue, null, 2));
      
      // Print first event details
      console.log('\n🎭 Sample event:');
      console.log(JSON.stringify(events[0], null, 2));
      
      // Print performances by show
      const mamma = events.filter(e => e.title.includes('Mamma Mia')).length;
      const newsies = events.filter(e => e.title.includes('Newsies')).length;
      console.log(`\n🎟️ Performance counts:`);
      console.log(`Mamma Mia!: ${mamma} performances`);
      console.log(`Newsies: ${newsies} performances`);
      
    } else {
      console.log('❌ No events found. The scraper may need to be updated or the website structure might have changed.');
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

// Run the test
testScraper();
