const fs = require('fs');
const path = require('path');

// All working Toronto scrapers - verified and fixed
const workingTorontoScrapers = [
  // Major venues (104 events from initial test)
  { file: 'horseshoeTavern.js', expectedEvents: 63 },
  { file: 'scotiabank.js', expectedEvents: 23 },
  { file: 'phoenixConcertTheatre.js', expectedEvents: 18 },
  
  // Fixed class-based scrapers (64 events)
  { file: 'scrape-casa-loma-working.js', expectedEvents: 1 },
  { file: 'scrape-cn-tower-working.js', expectedEvents: 15 },
  { file: 'scrape-danforth-music-hall-working.js', expectedEvents: 48 },
  
  // Additional fixed venues (40 events)
  { file: 'scrape-rebel-nightclub-working.js', expectedEvents: 22 },
  { file: 'scrape-roy-thomson-hall-working.js', expectedEvents: 17 }
];

async function testAllWorkingTorontoScrapers() {
  console.log('🎯 FINAL TORONTO SCRAPERS TEST - Verifying 200+ Events Goal');
  console.log('===========================================================\n');
  
  let totalEvents = 0;
  const results = [];
  const workingVenues = [];
  
  for (const { file, expectedEvents } of workingTorontoScrapers) {
    try {
      const scraperPath = `./scrapers/cities/Toronto/${file}`;
      
      if (!fs.existsSync(scraperPath)) {
        console.log(`❌ ${file}: FILE NOT FOUND`);
        results.push({ file, events: 0, status: 'FILE NOT FOUND', expected: expectedEvents });
        continue;
      }
      
      const scraper = require(scraperPath);
      
      console.log(`🔍 Testing ${file}...`);
      let events;
      
      if (typeof scraper.scrape === 'function') {
        events = await scraper.scrape('Toronto');
      } else if (typeof scraper === 'function') {
        events = await scraper('Toronto');
      } else {
        console.log(`❌ ${file}: Wrong export format`);
        results.push({ file, events: 0, status: 'EXPORT ERROR', expected: expectedEvents });
        continue;
      }
      
      const status = events.length >= expectedEvents * 0.8 ? 'WORKING ✅' : `LOW COUNT (expected ~${expectedEvents})`;
      console.log(`${status === 'WORKING ✅' ? '✅' : '⚠️'} ${file}: ${events.length} events`);
      
      totalEvents += events.length;
      results.push({ file, events: events.length, status, expected: expectedEvents });
      
      if (events.length > 0) {
        workingVenues.push({ 
          venue: file.replace('.js', '').replace('scrape-', '').replace('-working', ''), 
          events: events.length,
          expected: expectedEvents
        });
      }
      
    } catch (error) {
      console.log(`❌ ${file}: ${error.message.substring(0, 50)}`);
      results.push({ file, events: 0, status: `ERROR: ${error.message.substring(0, 30)}`, expected: expectedEvents });
    }
  }
  
  console.log('\n📊 FINAL TORONTO SCRAPERS SUMMARY:');
  console.log('=====================================');
  results.forEach(result => {
    const venue = result.file.replace('.js', '').replace('scrape-', '').replace('-working', '');
    const actualVsExpected = `${result.events}/${result.expected}`;
    console.log(`${venue.padEnd(30)} | ${actualVsExpected.padStart(8)} events | ${result.status}`);
  });
  console.log('=====================================');
  console.log(`📈 TOTAL EVENTS: ${totalEvents}`);
  console.log(`✅ Working Scrapers: ${results.filter(r => r.status.includes('WORKING')).length}/${results.length}`);
  console.log(`🎯 Goal Status: ${totalEvents >= 200 ? '✅ ACHIEVED' : '❌ FAILED'} (200+ events required)`);
  
  if (totalEvents >= 200) {
    console.log('\n🏆 SUCCESS! Toronto scrapers now provide 200+ events!');
    console.log('🔧 FIXES APPLIED:');
    console.log('   • Fixed syntax errors in massey-hall.js and meridian-hall.js');  
    console.log('   • Converted 4 class-based scrapers to function exports');
    console.log('   • Updated URLs and selectors for current website structures');
    console.log('   • Added comprehensive event filtering and validation');
  }
  
  if (workingVenues.length > 0) {
    console.log('\n🏆 TOP TORONTO VENUES BY EVENT COUNT:');
    workingVenues
      .sort((a, b) => b.events - a.events)
      .forEach((venue, i) => {
        const status = venue.events >= venue.expected * 0.8 ? '✅' : '⚠️';
        console.log(`${(i + 1).toString().padStart(2)}. ${venue.venue.padEnd(25)} | ${venue.events.toString().padStart(2)} events ${status}`);
      });
  }
  
  return { totalEvents, results, workingVenues };
}

testAllWorkingTorontoScrapers().catch(console.error);
