#!/usr/bin/env node

/**
 * RAPID STATUS - Test top scrapers FAST
 */

const scrapers = [
  'do604', 'madeInThe604', 'vancouversBestPlaces', 'theRoxy', 
  'vancouverArtGallery', 'fringeFestivalEvents', 'whistlerFilmFestival',
  'vancouverWritersFest', 'mansionClub', 'commodoreBallroom',
  'firehallArtsCentre', 'chanCentre', 'vancouverSymphony',
  'vancouverQueerFilmFestival', 'bellPerformingArtsCentre',
  'squamishArts', 'ubcChanCentre', 'vandusenGarden', 'bcPlace'
];

async function rapidStatus() {
  console.log('⚡ RAPID STATUS CHECK\n');
  
  let working = 0;
  let broken = 0;
  let empty = 0;
  let totalEvents = 0;

  for (const name of scrapers) {
    try {
      const filePath = `./scrapers/cities/vancouver/${name}.js`;
      delete require.cache[require.resolve(filePath)];
      const scraper = require(filePath);

      const scrapeFunc = typeof scraper === 'function' ? scraper : scraper.scrape;
      if (!scrapeFunc) {
        console.log(`❌ ${name.padEnd(35)} NO SCRAPE FUNCTION`);
        broken++;
        continue;
      }

      const events = await Promise.race([
        scrapeFunc('vancouver'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 6000))
      ]);

      if (events && events.length > 0) {
        console.log(`✅ ${name.padEnd(35)} ${events.length} events`);
        working++;
        totalEvents += events.length;
      } else {
        console.log(`⚪ ${name.padEnd(35)} 0 events`);
        empty++;
      }
    } catch (error) {
      console.log(`❌ ${name.padEnd(35)} ${error.message.substring(0,20)}`);
      broken++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ WORKING: ${working}/${scrapers.length} (${Math.round(working/scrapers.length*100)}%)`);
  console.log(`⚪ EMPTY: ${empty}`);
  console.log(`❌ BROKEN: ${broken}`);
  console.log(`🎉 TOTAL EVENTS: ${totalEvents}`);
  console.log(`\n🎯 Estimated total scrapers: ~${Math.round(working * 149/scrapers.length)} working`);
}

rapidStatus().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
