/**
 * Test script for The Vegan Market scraper
 */
const veganMarketEvents = require('./scrapers/cities/vancouver/veganMarketEvents');

async function runTest() {
  console.log('🔍 Testing The Vegan Market scraper...');
  try {
    const events = await veganMarketEvents.scrape();
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
