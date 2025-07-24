/**
 * Test script for Bard on the Beach Special Events scraper
 */
const bardOnTheBeachEvents = require('./bardOnTheBeachEvents');

// Add debug logging
console.log(`Testing test-bard-on-the-beach-scraper.js...`);


async function runTest() {
  console.log('🔍 Testing Bard on the Beach Special Events scraper...');
  try {
    const events = await bardOnTheBeachEvents.scrape();
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

try {
  runTest();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
