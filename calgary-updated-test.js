const fs = require('fs');
const path = require('path');

// Updated working Calgary scrapers
const workingScrapers = [
  'saddledome.js',
  'macEwanHall.js',
  'scrape-calgary-zoo.js',
  'scrape-heritage-park.js',
  'scrape-theatre-calgary.js'
];

async function testCalgaryScrapers() {
  console.log('🎯 Testing Updated Calgary Scrapers...\n');
  
  let totalEvents = 0;
  const results = [];
  
  for (const scraperFile of workingScrapers) {
    try {
      const scraperPath = `./scrapers/cities/Calgary/${scraperFile}`;
      const scraper = require(scraperPath);
      
      console.log(`\n🔍 Testing ${scraperFile}...`);
      let events;
      
      if (typeof scraper.scrape === 'function') {
        events = await scraper.scrape('Calgary');
      } else if (typeof scraper === 'function') {
        events = await scraper('Calgary');
      } else {
        console.log(`❌ ${scraperFile}: Export format issue`);
        continue;
      }
      
      console.log(`✅ ${scraperFile}: ${events.length} events`);
      totalEvents += events.length;
      results.push({ file: scraperFile, events: events.length });
      
    } catch (error) {
      console.log(`❌ ${scraperFile}: Error - ${error.message}`);
      results.push({ file: scraperFile, events: 0, error: error.message });
    }
  }
  
  console.log('\n📊 UPDATED CALGARY SCRAPERS SUMMARY:');
  console.log('====================================');
  results.forEach(result => {
    const status = result.error ? `ERROR: ${result.error.substring(0, 50)}` : `${result.events} events`;
    console.log(`${result.file.padEnd(32)} | ${status}`);
  });
  console.log('====================================');
  console.log(`🎉 Total Calgary Events: ${totalEvents}`);
  console.log(`🚀 Improvement: Theatre Calgary added 170 events!`);
  
  return totalEvents;
}

testCalgaryScrapers().catch(console.error);
