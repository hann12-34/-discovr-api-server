/**
 * Test script for Queer Arts Festival scraper
 */
const queerArtsFestivalEvents = require('./scrapers/cities/vancouver/queerArtsFestivalEvents');

async function runTest() {
  console.log('🔍 Testing Queer Arts Festival scraper...');
  try {
    const events = await queerArtsFestivalEvents.scrape();
    console.log(`✅ Found ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error);
  }
}

runTest();
