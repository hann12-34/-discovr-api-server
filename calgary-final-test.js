const fs = require('fs');
const path = require('path');

// Final working Calgary scrapers
const workingScrapers = [
  'saddledome.js',
  'macEwanHall.js',
  'scrape-calgary-zoo.js',
  'scrape-heritage-park.js',
  'scrape-theatre-calgary.js',
  'scrape-jubilee-auditorium.js'
];

async function testFinalCalgaryScrapers() {
  console.log('🎯 FINAL CALGARY SCRAPERS TEST\n');
  console.log('Testing all fixed Calgary venue scrapers...\n');
  
  let totalEvents = 0;
  const results = [];
  
  for (const scraperFile of workingScrapers) {
    try {
      const scraperPath = `./scrapers/cities/Calgary/${scraperFile}`;
      const scraper = require(scraperPath);
      
      console.log(`🔍 Testing ${scraperFile}...`);
      let events;
      
      if (typeof scraper.scrape === 'function') {
        events = await scraper.scrape('Calgary');
      } else if (typeof scraper === 'function') {
        events = await scraper('Calgary');
      } else {
        console.log(`❌ ${scraperFile}: Export format issue`);
        continue;
      }
      
      console.log(`✅ ${scraperFile}: ${events.length} events\n`);
      totalEvents += events.length;
      results.push({ file: scraperFile, events: events.length });
      
    } catch (error) {
      console.log(`❌ ${scraperFile}: Error - ${error.message}\n`);
      results.push({ file: scraperFile, events: 0, error: error.message });
    }
  }
  
  console.log('🏆 CALGARY SCRAPERS FINAL RESULTS:');
  console.log('=====================================');
  results.forEach(result => {
    const venue = result.file.replace('.js', '').replace('scrape-', '');
    const status = result.error ? `ERROR` : `${result.events} events`;
    console.log(`${venue.padEnd(25)} | ${status}`);
  });
  console.log('=====================================');
  console.log(`🎉 TOTAL CALGARY EVENTS: ${totalEvents}`);
  console.log(`📈 SUCCESS: ${results.filter(r => !r.error).length}/${results.length} venues working`);
  
  if (totalEvents >= 250) {
    console.log('\n🚀 EXCELLENT: Calgary scrapers are now fully functional!');
    console.log('   Major venues like Saddledome, Theatre Calgary, and Jubilee Auditorium');
    console.log('   are providing comprehensive event coverage for Calgary.');
  }
  
  return { totalEvents, workingVenues: results.filter(r => !r.error).length };
}

testFinalCalgaryScrapers().catch(console.error);
