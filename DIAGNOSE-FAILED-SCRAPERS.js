#!/usr/bin/env node

/**
 * DIAGNOSE FAILED SCRAPERS
 * Identify why scrapers are failing
 */

const fs = require('fs');
const path = require('path');

const CITY = 'vancouver';

async function diagnose() {
  console.log('🔍 DIAGNOSING VANCOUVER SCRAPERS\n');
  console.log('='.repeat(70));

  const cityDir = path.join(__dirname, 'scrapers', 'cities', CITY);
  const files = fs.readdirSync(cityDir)
    .filter(f => f.endsWith('.js') && 
                 !f.endsWith('.bak') && 
                 !f.includes('test') && 
                 !f.includes('index') &&
                 !f.includes('template'));

  const results = {
    working: [],
    errored: [],
    empty: [],
    timeout: []
  };

  console.log(`Testing ${files.length} scrapers...\n`);

  for (const file of files) {
    try {
      const scraperPath = path.join(cityDir, file);
      delete require.cache[require.resolve(scraperPath)];
      
      const scraper = require(scraperPath);

      // Set timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 45000)
      );

      let scrapePromise;
      if (typeof scraper === 'function') {
        scrapePromise = scraper(CITY);
      } else if (scraper.scrape) {
        scrapePromise = scraper.scrape(CITY);
      } else {
        results.errored.push({ file, error: 'No scrape function' });
        continue;
      }

      const events = await Promise.race([scrapePromise, timeoutPromise]);

      if (!events || events.length === 0) {
        results.empty.push(file);
      } else {
        results.working.push({ file, count: events.length });
      }

    } catch (error) {
      if (error.message === 'TIMEOUT') {
        results.timeout.push(file);
      } else {
        results.errored.push({ 
          file, 
          error: error.message.substring(0, 100) 
        });
      }
    }
  }

  // REPORT
  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNOSIS RESULTS');
  console.log('='.repeat(70));

  console.log(`\n✅ WORKING: ${results.working.length} scrapers`);
  if (results.working.length > 0) {
    results.working.slice(0, 10).forEach(s => {
      console.log(`  ${s.file}: ${s.count} events`);
    });
    if (results.working.length > 10) {
      console.log(`  ... and ${results.working.length - 10} more`);
    }
  }

  console.log(`\n⚠️  EMPTY: ${results.empty.length} scrapers (no events returned)`);
  if (results.empty.length > 0) {
    results.empty.slice(0, 15).forEach(f => {
      console.log(`  ${f}`);
    });
    if (results.empty.length > 15) {
      console.log(`  ... and ${results.empty.length - 15} more`);
    }
  }

  console.log(`\n⏱️  TIMEOUT: ${results.timeout.length} scrapers (>45s)`);
  if (results.timeout.length > 0) {
    results.timeout.slice(0, 10).forEach(f => {
      console.log(`  ${f}`);
    });
  }

  console.log(`\n❌ ERRORED: ${results.errored.length} scrapers`);
  if (results.errored.length > 0) {
    // Group by error type
    const errorGroups = {};
    results.errored.forEach(s => {
      const errorType = s.error.split(':')[0];
      if (!errorGroups[errorType]) {
        errorGroups[errorType] = [];
      }
      errorGroups[errorType].push(s.file);
    });

    Object.keys(errorGroups).forEach(errorType => {
      console.log(`\n  ${errorType}: ${errorGroups[errorType].length} scrapers`);
      errorGroups[errorType].slice(0, 5).forEach(f => {
        console.log(`    - ${f}`);
      });
      if (errorGroups[errorType].length > 5) {
        console.log(`    ... and ${errorGroups[errorType].length - 5} more`);
      }
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('📈 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total: ${files.length}`);
  console.log(`Working: ${results.working.length} (${Math.round(results.working.length/files.length*100)}%)`);
  console.log(`Empty: ${results.empty.length} (${Math.round(results.empty.length/files.length*100)}%)`);
  console.log(`Timeout: ${results.timeout.length} (${Math.round(results.timeout.length/files.length*100)}%)`);
  console.log(`Errored: ${results.errored.length} (${Math.round(results.errored.length/files.length*100)}%)`);

  const nonWorking = results.empty.length + results.timeout.length + results.errored.length;
  console.log(`\n⚠️  ${nonWorking} scrapers need fixing!`);
}

diagnose().then(() => {
  console.log('\n✅ DIAGNOSIS COMPLETE!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
