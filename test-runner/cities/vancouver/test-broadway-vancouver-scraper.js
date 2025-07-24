/**
 * Test script for Broadway Vancouver scraper
 */
const broadwayVancouverEvents = require('./broadwayVancouverEvents');

// Add debug logging
console.log(`Testing test-broadway-vancouver-scraper.js...`);


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

try {
  runTest();
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
