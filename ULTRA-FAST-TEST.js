#!/usr/bin/env node

/**
 * ULTRA FAST TEST - Test all scrapers with 5 second timeout each
 */

const fs = require('fs');
const path = require('path');

async function ultraFastTest() {
  console.log('⚡ ULTRA FAST TEST - 5s timeout per scraper\n');

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  const results = { working: [], empty: [], broken: [] };

  for (const file of files) {
    try {
      const scraperPath = path.join(cityDir, file);
      delete require.cache[require.resolve(scraperPath)];
      const scraper = require(scraperPath);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
      );

      let scrapePromise;
      if (typeof scraper === 'function') {
        scrapePromise = scraper('vancouver');
      } else if (scraper && scraper.scrape) {
        scrapePromise = scraper.scrape('vancouver');
      } else {
        results.broken.push({ file, reason: 'No scrape function' });
        continue;
      }

      const events = await Promise.race([scrapePromise, timeoutPromise]);

      if (events && events.length > 0) {
        results.working.push({ file, count: events.length });
        process.stdout.write('✅');
      } else {
        results.empty.push(file);
        process.stdout.write('⚪');
      }
    } catch (error) {
      results.broken.push({ file, reason: error.message.substring(0, 30) });
      process.stdout.write('❌');
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log(`✅ WORKING: ${results.working.length}/${files.length}`);
  console.log(`⚪ EMPTY: ${results.empty.length}`);
  console.log(`❌ BROKEN: ${results.broken.length}`);
  
  console.log('\n📊 WORKING SCRAPERS:');
  results.working.sort((a,b) => b.count - a.count).forEach(s => {
    console.log(`  ${s.file.padEnd(40)} ${s.count} events`);
  });

  if (results.broken.length > 0 && results.broken.length < 20) {
    console.log('\n❌ BROKEN:');
    results.broken.forEach(s => {
      console.log(`  ${s.file.padEnd(40)} ${s.reason}`);
    });
  }

  console.log(`\n🎯 PROGRESS: ${results.working.length}/149 (${Math.round(results.working.length/149*100)}%)`);
  console.log(`🎯 TARGET: 50 scrapers`);
  console.log(`📈 NEED: ${Math.max(0, 50 - results.working.length)} more`);
}

ultraFastTest().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
