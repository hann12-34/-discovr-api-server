/**
 * Test script for Chinese Garden scraper
 */

const chineseGardenScraper = require('./scrapers/cities/vancouver/chineseGardenEvents');

async function testChineseGardenScraper() {
  console.log('🧪 Testing Chinese Garden scraper...');
  
  try {
    const events = await chineseGardenScraper.scrape();
    
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

testChineseGardenScraper();
