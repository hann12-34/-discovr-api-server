const fs = require('fs');
const path = require('path');

// Expanded Toronto scrapers test - targeting 200+ events
const expandedTorontoScrapers = [
  // Initial working venues
  'horseshoeTavern.js',
  'scotiabank.js', 
  'phoenixConcertTheatre.js',
  'massey-hall.js',
  'meridian-hall.js',
  'rogersCentre.js',
  'royalAlexandraTheatre.js',
  
  // Additional major venues
  'scrape-ago-events-clean.js',
  'scrape-casa-loma-working.js',
  'scrape-cn-tower-working.js',
  'scrape-danforth-music-hall-working.js',
  'scrape-elgin-theatre.js',
  'scrape-harbourfront-centre.js',
  'scrape-princess-of-wales-theatre.js',
  'scrape-roy-thomson-hall.js',
  'scrape-sony-centre.js',
  'scrape-the-danforth.js',
  'scrape-toronto-centre-for-arts.js',
  'scrape-winter-garden-theatre.js'
];

async function testExpandedTorontoScrapers() {
  console.log('🎯 Testing Expanded Toronto Scrapers for 200+ Events...\n');
  
  let totalEvents = 0;
  const results = [];
  const workingVenues = [];
  
  for (const scraperFile of expandedTorontoScrapers) {
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
      
      if (events.length > 0) {
        workingVenues.push({ venue: scraperFile.replace('.js', ''), events: events.length });
      }
      
    } catch (error) {
      console.log(`❌ ${scraperFile}: ${error.message.substring(0, 50)}`);
      results.push({ file: scraperFile, events: 0, status: `ERROR: ${error.message.substring(0, 30)}` });
    }
  }
  
  console.log('\n📊 EXPANDED TORONTO SCRAPERS SUMMARY:');
  console.log('====================================');
  results.forEach(result => {
    const venue = result.file.replace('.js', '');
    console.log(`${venue.padEnd(30)} | ${result.events.toString().padStart(3)} events | ${result.status}`);
  });
  console.log('====================================');
  console.log(`📈 Total Events: ${totalEvents}`);
  console.log(`✅ Working: ${results.filter(r => r.status === 'WORKING').length}/${results.length} scrapers`);
  console.log(`🎯 Goal: ${totalEvents >= 200 ? '✅ ACHIEVED' : '❌ NEED MORE'} (200+ events)`);
  
  if (workingVenues.length > 0) {
    console.log('\n🏆 TOP VENUES BY EVENT COUNT:');
    workingVenues
      .sort((a, b) => b.events - a.events)
      .slice(0, 10)
      .forEach((venue, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. ${venue.venue.padEnd(25)} | ${venue.events} events`);
      });
  }
  
  return { totalEvents, results, workingVenues };
}

testExpandedTorontoScrapers().catch(console.error);
