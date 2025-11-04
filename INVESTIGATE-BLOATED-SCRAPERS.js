#!/usr/bin/env node

/**
 * INVESTIGATE BLOATED SCRAPERS
 * Check dates, junk, duplicates in detail
 */

const fs = require('fs');
const path = require('path');

const BLOATED_SCRAPERS = [
  { city: 'Calgary', file: 'scrape-spruce-meadows-events.js' },
  { city: 'Calgary', file: 'scrape-the-palace-theatre-events.js' },
  { city: 'Calgary', file: 'scrape-the-palace-theatre-nightlife.js' },
  { city: 'Montreal', file: 'scrape-bar-le-ritz-pdb-nightlife.js' },
  { city: 'Montreal', file: 'scrape-montreal-guaranteed-events.js' },
  { city: 'Montreal', file: 'scrape-place-des-arts-real.js' },
  { city: 'Montreal', file: 'scrape-theatre-st-denis-real.js' },
  { city: 'New York', file: 'apollo-theater.js' },
  { city: 'New York', file: 'brooklyn-academy-music.js' },
  { city: 'New York', file: 'javits-center.js' },
  { city: 'New York', file: 'radio-city-music-hall.js' },
  { city: 'New York', file: 'scrape-prospect-park-bandshell.js' },
  { city: 'New York', file: 'scrape-union-hall.js' },
  { city: 'Toronto', file: 'scrape-bata-shoe-museum-events.js' },
  { city: 'Toronto', file: 'scrape-centre-island-events.js' },
  { city: 'Toronto', file: 'scrape-crow-s-theatre-events.js' },
  { city: 'Toronto', file: 'scrape-justina-barnicke-gallery-events.js' },
  { city: 'Toronto', file: 'scrape-kingsway-theatre-events.js' },
  { city: 'Toronto', file: 'scrape-roy-thomson-hall-events.js' },
  { city: 'Toronto', file: 'scrape-small-world-music-events.js' },
  { city: 'Toronto', file: 'scrape-sound-academy-events.js' },
  { city: 'Toronto', file: 'scrape-the-hideaway-events.js' },
  { city: 'Toronto', file: 'scrape-toronto-star-building-events.js' },
  { city: 'Toronto', file: 'scrape-vatican-gift-shop-events.js' },
  { city: 'Toronto', file: 'scrape-videofag-events.js' },
  { city: 'vancouver', file: 'commodoreBallroom.js' },
  { city: 'vancouver', file: 'fortuneSoundClub.js' },
  { city: 'vancouver', file: 'foxCabaret.js' },
  { city: 'vancouver', file: 'orpheum.js' },
  { city: 'vancouver', file: 'sidWilliamsTheatre.js' }
];

async function investigate() {
  console.log('🔍 INVESTIGATING BLOATED SCRAPERS\n');
  console.log('='.repeat(70));

  for (const { city, file } of BLOATED_SCRAPERS) {
    const scraperPath = path.join(__dirname, 'scrapers', 'cities', city, file);
    
    if (!fs.existsSync(scraperPath)) {
      console.log(`\n❌ ${file} NOT FOUND`);
      continue;
    }

    console.log(`\n📍 ${file} (${city})`);
    console.log('-'.repeat(70));

    try {
      delete require.cache[require.resolve(scraperPath)];
      const scraper = require(scraperPath);

      let events = [];
      if (typeof scraper === 'function') {
        events = await scraper(city);
      } else if (scraper.scrape) {
        events = await scraper.scrape(city);
      }

      if (!events || events.length === 0) {
        console.log('⚠️  No events returned');
        continue;
      }

      console.log(`Total events: ${events.length}`);

      // Check NULL dates
      const nullDates = events.filter(e => !e.date || e.date === null);
      console.log(`NULL dates: ${nullDates.length}`);
      if (nullDates.length > 0) {
        nullDates.slice(0, 3).forEach(e => {
          console.log(`  - "${e.title}"`);
        });
      }

      // Check for fallback strings
      const fallbacks = events.filter(e => 
        e.date && typeof e.date === 'string' && 
        (e.date.includes('TBA') || e.date.includes('TBD') || e.date.includes('Ongoing'))
      );
      console.log(`Fallback dates: ${fallbacks.length}`);

      // Check for invalid/weird dates
      const weirdDates = events.filter(e => 
        e.date && typeof e.date === 'string' && 
        (e.date.length < 5 || e.date.length > 50 || e.date.toLowerCase().includes('check'))
      );
      console.log(`Weird dates: ${weirdDates.length}`);
      if (weirdDates.length > 0) {
        weirdDates.slice(0, 3).forEach(e => {
          console.log(`  - "${e.date}" for "${e.title}"`);
        });
      }

      // Check for duplicate titles
      const titles = events.map(e => e.title);
      const uniqueTitles = new Set(titles);
      const duplicates = titles.length - uniqueTitles.size;
      console.log(`Duplicate titles: ${duplicates}`);

      // Check for junk titles
      const junkPatterns = [
        /^buy/i, /^learn more/i, /^view/i, /^show/i, /^events?$/i,
        /^home$/i, /^menu$/i, /^tickets?$/i, /^more$/i, /^info$/i
      ];
      const junk = events.filter(e => junkPatterns.some(p => p.test(e.title)));
      console.log(`Junk titles: ${junk.length}`);
      if (junk.length > 0) {
        junk.slice(0, 3).forEach(e => {
          console.log(`  - "${e.title}"`);
        });
      }

      // Check for short titles
      const shortTitles = events.filter(e => e.title && e.title.length < 10);
      console.log(`Short titles (<10 chars): ${shortTitles.length}`);

      // Sample some events
      console.log('\nSample events:');
      events.slice(0, 3).forEach(e => {
        console.log(`  - "${e.title}" | Date: "${e.date}" | URL: ${e.url?.substring(0, 50)}...`);
      });

      // VERDICT
      const issues = nullDates.length + fallbacks.length + weirdDates.length + junk.length;
      if (issues > 10 || duplicates > 20) {
        console.log(`\n🚨 VERDICT: NEEDS FIXING (${issues} issues, ${duplicates} duplicates)`);
      } else if (issues > 0) {
        console.log(`\n⚠️  VERDICT: MINOR ISSUES (${issues} issues)`);
      } else {
        console.log(`\n✅ VERDICT: LOOKS GOOD`);
      }

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🏁 INVESTIGATION COMPLETE');
}

investigate().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
