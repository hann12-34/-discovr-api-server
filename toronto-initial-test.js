const fs = require('fs');
const path = require('path');

// Key Toronto scrapers to test first
const torontoScrapers = [
  'rogersCentre.js',
  'scotiabank.js', 
  'massey-hall.js',
  'meridian-hall.js',
  'horseshoeTavern.js',
  'phoenixConcertTheatre.js',
  'royalAlexandraTheatre.js'
];

async function testTorontoScrapers() {
  console.log('🎯 Testing Toronto Scrapers Initial Status...\n');
  
  let totalEvents = 0;
  const results = [];
  
  for (const scraperFile of torontoScrapers) {
    try {
      const scraperPath = `./scrapers/cities/Toronto/${scraperFile}`;
      
      // Check if file exists
      if (!fs.existsSync(scraperPath)) {
        results.push({ file: scraperFile, events: 0, status: 'FILE NOT FOUND' });
        console.log(`❌ ${scraperFile}: FILE NOT FOUND`);
        continue;
      }
      
      const scraper = require(scraperPath);
      
      console.log(`🔍 Testing ${scraperFile}...`);
      let events;
      
      if (typeof scraper.scrape === 'function') {
        events = await scraper.scrape('Toronto');
        console.log(`✅ ${scraperFile}: ${events.length} events (object export)`);
      } else if (typeof scraper === 'function') {
        events = await scraper('Toronto');
        console.log(`✅ ${scraperFile}: ${events.length} events (function export)`);
      } else {
        console.log(`❌ ${scraperFile}: Wrong export format`);
        results.push({ file: scraperFile, events: 0, status: 'EXPORT ERROR' });
        continue;
      }
      
      totalEvents += events.length;
      results.push({ file: scraperFile, events: events.length, status: 'WORKING' });
      
    } catch (error) {
      console.log(`❌ ${scraperFile}: ${error.message.substring(0, 50)}`);
      results.push({ file: scraperFile, events: 0, status: `ERROR: ${error.message.substring(0, 30)}` });
    }
  }
  
  console.log('\n📊 TORONTO SCRAPERS INITIAL SUMMARY:');
  console.log('=====================================');
  results.forEach(result => {
    const venue = result.file.replace('.js', '');
    console.log(`${venue.padEnd(25)} | ${result.events} events | ${result.status}`);
  });
  console.log('=====================================');
  console.log(`📈 Total Events: ${totalEvents}`);
  console.log(`✅ Working: ${results.filter(r => r.status === 'WORKING').length}/${results.length} scrapers`);
  
  return { totalEvents, results };
}

testTorontoScrapers().catch(console.error);
