#!/usr/bin/env node

/**
 * FINAL COUNT - Accurate count with 15s timeout for Puppeteer
 */

const fs = require('fs');
const path = require('path');

async function finalCount() {
  console.log('🎯 FINAL ACCURATE COUNT - 15s timeout per scraper\n');

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir).filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  const results = { working: [], empty: [], broken: [] };

  for (const file of files) {
    try {
      const filePath = path.join(cityDir, file);
      delete require.cache[require.resolve(filePath)];
      const scraper = require(filePath);

      const scrapeFunc = typeof scraper === 'function' ? scraper : (scraper && scraper.scrape);
      if (!scrapeFunc) {
        results.broken.push({ file, reason: 'No scrape function' });
        continue;
      }

      const events = await Promise.race([
        scrapeFunc('vancouver'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 15000))
      ]);

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
  console.log(`✅ WORKING: ${results.working.length}/${files.length} (${Math.round(results.working.length/files.length*100)}%)`);
  console.log(`⚪ EMPTY: ${results.empty.length}`);
  console.log(`❌ BROKEN: ${results.broken.length}`);

  const total = results.working.reduce((sum, s) => sum + s.count, 0);
  console.log(`\n🎉 TOTAL EVENTS: ${total}`);

  console.log('\n📊 ALL WORKING SCRAPERS:');
  results.working.sort((a, b) => b.count - a.count).forEach((s, i) => {
    console.log(`${(i+1).toString().padStart(2)}. ${s.file.padEnd(45)} ${s.count} events`);
  });

  console.log(`\n🎯 TARGET: 50 working scrapers`);
  if (results.working.length >= 50) {
    console.log(`\n🎉🎉🎉 TARGET ACHIEVED! ${results.working.length} WORKING SCRAPERS! 🎉🎉🎉`);
  } else {
    console.log(`📈 NEED: ${50 - results.working.length} more to reach target`);
  }

  return results;
}

finalCount().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
