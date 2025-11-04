#!/usr/bin/env node

/**
 * COUNT ALL 149 SCRAPERS - Get accurate working count
 */

const fs = require('fs');
const path = require('path');

async function countAll() {
  console.log('🎯 COUNTING ALL 149 VANCOUVER SCRAPERS\n');

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir).filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  const results = { working: [], empty: [], broken: [] };
  let tested = 0;

  for (const file of files) {
    tested++;
    process.stdout.write(`\r[${tested}/${files.length}] Testing...`);

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
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000))
      ]);

      if (events && events.length > 0) {
        results.working.push({ file, count: events.length });
      } else {
        results.empty.push(file);
      }
    } catch (error) {
      results.broken.push({ file, reason: error.message.substring(0, 30) });
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log(`✅ WORKING: ${results.working.length}/${files.length} (${Math.round(results.working.length/files.length*100)}%)`);
  console.log(`⚪ EMPTY: ${results.empty.length}`);
  console.log(`❌ BROKEN: ${results.broken.length}`);

  const total = results.working.reduce((sum, s) => sum + s.count, 0);
  console.log(`\n🎉 TOTAL EVENTS: ${total}`);

  console.log('\n📊 TOP 20 WORKING SCRAPERS:');
  results.working.sort((a, b) => b.count - a.count).slice(0, 20).forEach(s => {
    console.log(`  ${s.file.padEnd(45)} ${s.count} events`);
  });

  console.log(`\n🎯 TARGET: 50 working scrapers`);
  console.log(`📈 ${results.working.length >= 50 ? '🎉 TARGET ACHIEVED!' : `NEED: ${50 - results.working.length} more`}`);

  return results;
}

countAll().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
