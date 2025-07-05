/**
 * Test script for Vancouver Short Film Festival (VSFF) scraper
 */

const vsffScraper = require('./scrapers/cities/vancouver/vsffEvents');

async function testVSFFScraper() {
  console.log('🧪 Testing Vancouver Short Film Festival scraper...');
  
  try {
    const events = await vsffScraper.scrape();
    
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

testVSFFScraper();
