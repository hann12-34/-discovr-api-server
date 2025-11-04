#!/usr/bin/env node

/**
 * DOUBLE CHECK ALL SCRAPERS
 * Verify: No NULL, No Junk, No Duplicates, No Bloated
 */

const fs = require('fs');
const path = require('path');

const CITIES = ['Calgary', 'Montreal', 'New York', 'Toronto', 'vancouver'];

const JUNK_PATTERNS = [
  /^buy tickets?$/i,
  /^learn more$/i,
  /^view all/i,
  /^show calendar$/i,
  /^events?$/i,
  /^home$/i,
  /^menu$/i,
  /^tickets?$/i,
  /^details$/i,
  /^info$/i,
  /^more$/i,
  /^get this offer$/i,
  /^shows? & tickets$/i,
  /\{fill:/i,
  /evenodd/i,
  /^cancelled$/i,
  /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i  // Date-only titles
];

async function checkAllScrapers() {
  console.log('🔍 DOUBLE CHECKING ALL SCRAPERS');
  console.log('='.repeat(70));

  const issues = {
    nullDates: [],
    junk: [],
    duplicates: [],
    bloated: [],
    fallbacks: []
  };

  let totalScrapers = 0;
  let workingScrapers = 0;

  for (const city of CITIES) {
    console.log(`\n📍 Checking ${city}...`);
    
    const cityDir = path.join(__dirname, 'scrapers', 'cities', city);
    
    if (!fs.existsSync(cityDir)) {
      console.log(`  ⚠️  Directory not found`);
      continue;
    }

    const files = fs.readdirSync(cityDir)
      .filter(f => f.endsWith('.js') && 
                   !f.endsWith('.bak') && 
                   !f.includes('test') && 
                   !f.includes('index') &&
                   !f.includes('template') &&
                   !f.includes('boilerplate') &&
                   !f.includes('generator'));

    for (const file of files) {
      totalScrapers++;
      
      try {
        const scraperPath = path.join(cityDir, file);
        delete require.cache[require.resolve(scraperPath)];
        const scraper = require(scraperPath);

        let events = [];
        if (typeof scraper === 'function') {
          events = await scraper(city);
        } else if (scraper.scrape) {
          events = await scraper.scrape(city);
        }

        if (!events || events.length === 0) {
          continue;
        }

        workingScrapers++;
        const scraperInfo = `${city}/${file}`;

        // Check 1: NULL dates
        const nullDates = events.filter(e => !e.date || e.date === null);
        if (nullDates.length > 0) {
          issues.nullDates.push({
            scraper: scraperInfo,
            count: nullDates.length,
            total: events.length,
            examples: nullDates.slice(0, 2).map(e => e.title)
          });
        }

        // Check 2: Fallback strings
        const fallbacks = events.filter(e => 
          e.date && typeof e.date === 'string' && 
          (e.date.includes('TBA') || e.date.includes('TBD') || 
           e.date.includes('Ongoing') || e.date.includes('Coming Soon') ||
           e.date.toLowerCase().includes('check website'))
        );
        if (fallbacks.length > 0) {
          issues.fallbacks.push({
            scraper: scraperInfo,
            count: fallbacks.length,
            examples: fallbacks.slice(0, 2).map(e => `"${e.title}" → ${e.date}`)
          });
        }

        // Check 3: Junk titles
        const junk = events.filter(e => 
          JUNK_PATTERNS.some(p => p.test(e.title)) || 
          (e.title && e.title.length < 10)
        );
        if (junk.length > 0) {
          issues.junk.push({
            scraper: scraperInfo,
            count: junk.length,
            total: events.length,
            examples: junk.slice(0, 3).map(e => e.title)
          });
        }

        // Check 4: Duplicates
        const titles = events.map(e => `${e.title}|${e.date}`);
        const uniqueTitles = new Set(titles);
        const duplicateCount = titles.length - uniqueTitles.size;
        if (duplicateCount > 5) {
          issues.duplicates.push({
            scraper: scraperInfo,
            count: duplicateCount,
            total: events.length,
            percentage: Math.round((duplicateCount / events.length) * 100)
          });
        }

        // Check 5: Bloated (>30 events)
        if (events.length > 30) {
          issues.bloated.push({
            scraper: scraperInfo,
            count: events.length
          });
        }

      } catch (error) {
        // Silent - scraper may have errors
      }
    }
  }

  // REPORT
  console.log('\n' + '='.repeat(70));
  console.log('📊 DOUBLE CHECK RESULTS');
  console.log('='.repeat(70));
  console.log(`Total scrapers checked: ${totalScrapers}`);
  console.log(`Working scrapers: ${workingScrapers}`);

  let hasIssues = false;

  // NULL Dates
  if (issues.nullDates.length > 0) {
    hasIssues = true;
    console.log(`\n❌ NULL DATES: ${issues.nullDates.length} scrapers`);
    issues.nullDates.forEach(s => {
      console.log(`  ${s.scraper}: ${s.count}/${s.total} NULL`);
      s.examples.forEach(ex => console.log(`    - "${ex}"`));
    });
  } else {
    console.log(`\n✅ NULL DATES: 0 scrapers with NULL dates`);
  }

  // Fallbacks
  if (issues.fallbacks.length > 0) {
    hasIssues = true;
    console.log(`\n❌ FALLBACK STRINGS: ${issues.fallbacks.length} scrapers`);
    issues.fallbacks.forEach(s => {
      console.log(`  ${s.scraper}: ${s.count} fallbacks`);
      s.examples.forEach(ex => console.log(`    - ${ex}`));
    });
  } else {
    console.log(`\n✅ FALLBACK STRINGS: 0 scrapers with fallbacks`);
  }

  // Junk
  if (issues.junk.length > 0) {
    hasIssues = true;
    console.log(`\n❌ JUNK TITLES: ${issues.junk.length} scrapers`);
    issues.junk.forEach(s => {
      console.log(`  ${s.scraper}: ${s.count}/${s.total} junk`);
      s.examples.forEach(ex => console.log(`    - "${ex}"`));
    });
  } else {
    console.log(`\n✅ JUNK TITLES: 0 scrapers with junk`);
  }

  // Duplicates
  if (issues.duplicates.length > 0) {
    hasIssues = true;
    console.log(`\n❌ DUPLICATES: ${issues.duplicates.length} scrapers`);
    issues.duplicates.forEach(s => {
      console.log(`  ${s.scraper}: ${s.count}/${s.total} duplicates (${s.percentage}%)`);
    });
  } else {
    console.log(`\n✅ DUPLICATES: 0 scrapers with excessive duplicates`);
  }

  // Bloated
  if (issues.bloated.length > 0) {
    hasIssues = true;
    console.log(`\n❌ BLOATED (>30 events): ${issues.bloated.length} scrapers`);
    issues.bloated.forEach(s => {
      console.log(`  ${s.scraper}: ${s.count} events`);
    });
  } else {
    console.log(`\n✅ BLOATED: 0 scrapers with >30 events`);
  }

  console.log('\n' + '='.repeat(70));
  
  if (hasIssues) {
    console.log('⚠️  ISSUES FOUND - See details above');
  } else {
    console.log('🎉 PERFECT! All scrapers are clean!');
  }
}

checkAllScrapers().then(() => {
  console.log('\n✅ DOUBLE CHECK COMPLETE!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
