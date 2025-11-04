#!/usr/bin/env node

/**
 * PARALLEL QUICK COUNT
 * Test scrapers in parallel batches for speed
 */

const fs = require('fs');
const path = require('path');

async function testBatch(files) {
  const results = [];
  
  for (const file of files) {
    try {
      const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', file);
      delete require.cache[require.resolve(scraperPath)];
      const scraper = require(scraperPath);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 6000)
      );

      let scrapePromise;
      if (typeof scraper === 'function') {
        scrapePromise = scraper('vancouver');
      } else if (scraper && scraper.scrape) {
        scrapePromise = scraper.scrape('vancouver');
      } else {
        continue;
      }

      const events = await Promise.race([scrapePromise, timeoutPromise]);

      if (events && events.length > 0) {
        results.push({ file, count: events.length, status: 'working' });
        process.stdout.write('✅');
      } else {
        process.stdout.write('⚪');
      }
    } catch (error) {
      process.stdout.write('❌');
    }
  }
  
  return results;
}

async function parallelCount() {
  console.log('⚡ PARALLEL QUICK COUNT - 6s timeout per scraper\n');

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  console.log(`Testing ${files.length} scrapers...\n`);

  // Split into 3 batches for speed
  const batchSize = Math.ceil(files.length / 3);
  const batch1 = files.slice(0, batchSize);
  const batch2 = files.slice(batchSize, batchSize * 2);
  const batch3 = files.slice(batchSize * 2);

  console.log('Batch 1:');
  const results1 = await testBatch(batch1);
  console.log('\n\nBatch 2:');
  const results2 = await testBatch(batch2);
  console.log('\n\nBatch 3:');
  const results3 = await testBatch(batch3);

  const allResults = [...results1, ...results2, ...results3];

  console.log('\n\n' + '='.repeat(70));
  console.log(`✅ WORKING: ${allResults.length}/${files.length} (${Math.round(allResults.length/files.length*100)}%)`);
  
  console.log('\n📊 WORKING SCRAPERS:');
  allResults.sort((a, b) => b.count - a.count).forEach(s => {
    console.log(`  ${s.file.padEnd(45)} ${s.count} events`);
  });

  const totalEvents = allResults.reduce((sum, s) => sum + s.count, 0);
  console.log(`\n🎉 TOTAL EVENTS: ${totalEvents}`);
  console.log(`🎯 TARGET: 50 working scrapers (need ${Math.max(0, 50 - allResults.length)} more)`);
  console.log(`🎯 TARGET: 500 events (need ${Math.max(0, 500 - totalEvents)} more)`);
  
  if (allResults.length >= 50) {
    console.log('\n🎉🎉🎉 TARGET ACHIEVED! 50+ SCRAPERS WORKING! 🎉🎉🎉');
  }
}

parallelCount().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
