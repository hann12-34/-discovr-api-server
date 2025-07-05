/**
 * Test script for Run to End Endo scraper
 */

const runToEndEndoScraper = require('./scrapers/cities/vancouver/runToEndEndoEvents');

async function testRunToEndEndoScraper() {
  console.log('🧪 Testing Run to End Endo scraper...');
  
  try {
    const events = await runToEndEndoScraper.scrape();
    
    console.log(`✅ Found ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
    }
    
    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRunToEndEndoScraper();
