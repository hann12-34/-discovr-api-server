/**
 * Test script for Broadway Vancouver scraper
 */
const broadwayVancouverEvents = require('./scrapers/cities/vancouver/broadwayVancouverEvents');

async function runTest() {
  console.log('🔍 Testing Broadway Vancouver scraper...');
  try {
    const events = await broadwayVancouverEvents.scrape();
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
