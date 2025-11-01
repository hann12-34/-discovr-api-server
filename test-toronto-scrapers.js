/**
 * TEST SAMPLE TORONTO SCRAPERS
 */

async function testTorontoScrapers() {
  console.log('🧪 TESTING TORONTO SCRAPERS\n');
  console.log('='.repeat(80));
  
  const scrapersToTest = [
    './scrapers/cities/Toronto/scotiabankArena.js',
  ];
  
  for (const scraperPath of scrapersToTest) {
    try {
      console.log(`\n📍 Testing: ${scraperPath.split('/').pop()}`);
      const scraper = require(scraperPath);
      
      let events;
      if (typeof scraper === 'function') {
        events = await scraper();
      } else if (scraper.scrape) {
        events = await scraper.scrape('Toronto');
      } else {
        console.log('   ❌ Unknown scraper format');
        continue;
      }
      
      console.log(`   ✅ Returned ${events?.length || 0} events`);
      
      if (events && events.length > 0) {
        console.log('\n   Sample events:');
        events.slice(0, 3).forEach((e, i) => {
          const date = new Date(e.startDate || e.date);
          console.log(`   ${i + 1}. ${e.title}`);
          console.log(`      Date: ${date.toDateString()} ${isNaN(date.getTime()) ? '❌ INVALID' : '✅'}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

testTorontoScrapers();
