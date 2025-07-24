/**
 * Test script for Japan Market Vancouver scraper
 */

const japanMarketScraper = require('./scrapers/cities/vancouver/japanMarketEvents');

async function testJapanMarketScraper() {
  console.log('🧪 Testing Japan Market Vancouver scraper...');
  
  try {
    const events = await japanMarketScraper.scrape();
    
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

testJapanMarketScraper();
