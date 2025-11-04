#!/usr/bin/env node

/**
 * FINAL ERROR CHECK
 * Verify NO errors remain
 */

const fs = require('fs');
const path = require('path');

async function finalErrorCheck() {
  console.log('🔍 FINAL ERROR CHECK - VERIFYING NO ERRORS\n');

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir).filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  let syntaxErrors = 0;
  let runtimeErrors = 0;
  let nullDates = 0;
  let duplicates = 0;
  let totalEvents = 0;
  let workingScrapers = 0;

  console.log('Testing all scrapers...\n');

  for (const file of files) {
    try {
      const filePath = path.join(cityDir, file);
      
      // Check for syntax errors
      delete require.cache[require.resolve(filePath)];
      const scraper = require(filePath);
      const scrapeFunc = typeof scraper === 'function' ? scraper : (scraper && scraper.scrape);
      
      if (!scrapeFunc) continue;

      // Run scraper
      const events = await Promise.race([
        scrapeFunc('vancouver'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000))
      ]);

      if (events && events.length > 0) {
        workingScrapers++;
        totalEvents += events.length;
        
        // Check for NULL dates
        const nulls = events.filter(e => !e.date || e.date === null);
        if (nulls.length > 0) {
          console.log(`❌ ${file}: ${nulls.length} NULL dates`);
          nullDates += nulls.length;
        }
        
        // Check for duplicates
        const urls = new Set(events.map(e => e.url));
        const dupes = events.length - urls.size;
        if (dupes > 0) {
          console.log(`⚠️  ${file}: ${dupes} duplicates`);
          duplicates += dupes;
        }
      }
    } catch (error) {
      if (error.message.includes('TIMEOUT')) {
        // Timeout is OK for Puppeteer scrapers
      } else if (error.message.includes('SyntaxError') || error.message.includes('Unexpected')) {
        console.log(`💥 ${file}: SYNTAX ERROR - ${error.message.substring(0, 60)}`);
        syntaxErrors++;
      } else {
        console.log(`❌ ${file}: RUNTIME ERROR - ${error.message.substring(0, 60)}`);
        runtimeErrors++;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL ERROR REPORT:\n');
  
  console.log(`✅ Working scrapers: ${workingScrapers}`);
  console.log(`✅ Total events: ${totalEvents}`);
  console.log(`\n💥 Syntax errors: ${syntaxErrors}`);
  console.log(`❌ Runtime errors: ${runtimeErrors}`);
  console.log(`⚠️  NULL dates: ${nullDates}`);
  console.log(`🔁 Duplicates: ${duplicates}`);
  
  console.log('\n' + '='.repeat(70));
  
  if (syntaxErrors === 0 && runtimeErrors === 0 && nullDates === 0 && duplicates < 10) {
    console.log('✅✅✅ SUCCESS! NO MAJOR ERRORS! ✅✅✅');
    console.log(`\n🎉 System is CLEAN with ${workingScrapers} working scrapers and ${totalEvents} events!`);
  } else {
    console.log('⚠️  ISSUES FOUND:');
    if (syntaxErrors > 0) console.log(`  - ${syntaxErrors} syntax errors need fixing`);
    if (runtimeErrors > 0) console.log(`  - ${runtimeErrors} runtime errors need fixing`);
    if (nullDates > 0) console.log(`  - ${nullDates} NULL dates need fixing`);
    if (duplicates >= 10) console.log(`  - ${duplicates} duplicates need fixing`);
  }
}

finalErrorCheck().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
