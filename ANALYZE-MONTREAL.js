const fs = require('fs');
const path = require('path');

async function analyzeMontrealScrapers() {
  console.log('🔍 Analyzing Montreal scrapers...\n');
  
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Montreal');
  const allFiles = fs.readdirSync(scrapersDir);
  const scraperFiles = allFiles.filter(file => 
    file.endsWith('.js') && 
    !file.includes('test') &&
    !file.includes('index') &&
    !file.includes('backup') &&
    !file.includes('.bak') &&
    !file.includes('template')
  );
  
  const results = { working: [], noEvents: [], errors: [] };
  
  for (const file of scraperFiles) {
    try {
      const scraperPath = path.join(scrapersDir, file);
      const scraper = require(scraperPath);
      
      if (typeof scraper !== 'function') {
        results.errors.push({ file, error: 'Not a function' });
        continue;
      }
      
      const events = await scraper('Montreal');
      
      if (events && Array.isArray(events)) {
        if (events.length > 0) {
          results.working.push({ file, count: events.length });
        } else {
          results.noEvents.push(file);
        }
      } else {
        results.errors.push({ file, error: 'Invalid return type' });
      }
      
    } catch (error) {
      results.errors.push({ file, error: error.message.substring(0, 100) });
    }
  }
  
  console.log('📊 MONTREAL SCRAPERS ANALYSIS');
  console.log('='.repeat(60));
  console.log(`✅ Working with events: ${results.working.length}`);
  console.log(`⚠️  Working but 0 events: ${results.noEvents.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  console.log(`📁 Total: ${scraperFiles.length}`);
  
  if (results.noEvents.length > 0) {
    console.log(`\n⚠️  0-event scrapers (${results.noEvents.length}):`);
    results.noEvents.forEach(f => console.log(`   ${f}`));
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Error scrapers (${results.errors.length}):`);
    results.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }
  
  fs.writeFileSync('MONTREAL_ANALYSIS.json', JSON.stringify(results, null, 2));
}

analyzeMontrealScrapers().catch(console.error);
