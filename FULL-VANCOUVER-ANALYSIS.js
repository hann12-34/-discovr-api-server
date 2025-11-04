#!/usr/bin/env node

/**
 * FULL VANCOUVER ANALYSIS
 * Test all scrapers quickly and categorize results
 */

const fs = require('fs');
const path = require('path');

async function analyze() {
  console.log('🔍 ANALYZING ALL VANCOUVER SCRAPERS\n');

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak') && 
                 !f.includes('test') && !f.includes('index'));

  const results = {
    working: [],
    syntaxError: [],
    runtimeError: [],
    empty: [],
    timeout: []
  };

  console.log(`Testing ${files.length} scrapers...\n`);

  for (const file of files) {
    try {
      const scraperPath = path.join(cityDir, file);
      delete require.cache[require.resolve(scraperPath)];
      
      try {
        const scraper = require(scraperPath);

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 10000)
        );

        let scrapePromise;
        if (typeof scraper === 'function') {
          scrapePromise = scraper('vancouver');
        } else if (scraper && scraper.scrape) {
          scrapePromise = scraper.scrape('vancouver');
        } else {
          results.syntaxError.push({ file, error: 'No scrape function' });
          continue;
        }

        const events = await Promise.race([scrapePromise, timeoutPromise]);

        if (events && events.length > 0) {
          results.working.push({ file, count: events.length });
        } else {
          results.empty.push(file);
        }
      } catch (runError) {
        if (runError.message === 'TIMEOUT') {
          results.timeout.push(file);
        } else {
          results.runtimeError.push({ 
            file, 
            error: runError.message.substring(0, 60) 
          });
        }
      }
    } catch (loadError) {
      results.syntaxError.push({ 
        file, 
        error: loadError.message.substring(0, 60) 
      });
    }
  }

  // REPORT
  console.log('='.repeat(70));
  console.log('📊 RESULTS');
  console.log('='.repeat(70));

  const total = files.length;
  const working = results.working.length;
  const broken = results.syntaxError.length + results.runtimeError.length;
  const noEvents = results.empty.length + results.timeout.length;

  console.log(`\n✅ WORKING: ${working}/${total} (${Math.round(working/total*100)}%)`);
  if (working > 0) {
    const totalEvents = results.working.reduce((sum, s) => sum + s.count, 0);
    console.log(`   Total events: ${totalEvents}`);
    console.log(`   Top 10:`);
    results.working
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .forEach(s => console.log(`     ${s.file}: ${s.count} events`));
  }

  console.log(`\n⚠️  NO EVENTS: ${noEvents}/${total} (${Math.round(noEvents/total*100)}%)`);
  console.log(`   Empty: ${results.empty.length}`);
  console.log(`   Timeout: ${results.timeout.length}`);

  console.log(`\n❌ BROKEN: ${broken}/${total} (${Math.round(broken/total*100)}%)`);
  console.log(`   Syntax errors: ${results.syntaxError.length}`);
  console.log(`   Runtime errors: ${results.runtimeError.length}`);

  if (results.syntaxError.length > 0) {
    console.log(`\n  Syntax Errors:`);
    results.syntaxError.slice(0, 5).forEach(s => {
      console.log(`    ${s.file}: ${s.error}`);
    });
  }

  if (results.runtimeError.length > 0) {
    console.log(`\n  Runtime Errors (sample):`);
    const errorGroups = {};
    results.runtimeError.forEach(s => {
      const key = s.error.substring(0, 40);
      if (!errorGroups[key]) errorGroups[key] = [];
      errorGroups[key].push(s.file);
    });

    Object.keys(errorGroups).slice(0, 5).forEach(errorType => {
      console.log(`\n    ${errorType}...`);
      console.log(`    ${errorGroups[errorType].length} scrapers`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎯 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Coverage: ${working}/${total} (${Math.round(working/total*100)}%)`);
  console.log(`Need fixing: ${broken + noEvents} scrapers`);
  
  const coverage = Math.round(working/total*100);
  if (coverage >= 90) {
    console.log('\n🎉 EXCELLENT COVERAGE!');
  } else if (coverage >= 50) {
    console.log('\n👍 GOOD PROGRESS - Keep going!');
  } else {
    console.log('\n⚠️  MORE WORK NEEDED');
  }
}

analyze().then(() => {
  console.log('\n✅ ANALYSIS COMPLETE!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
