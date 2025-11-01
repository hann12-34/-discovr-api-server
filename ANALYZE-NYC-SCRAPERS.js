const fs = require('fs');
const path = require('path');

async function analyzeNYCScrapers() {
  console.log('🔍 Analyzing New York scrapers...\n');
  
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');
  const allFiles = fs.readdirSync(scrapersDir);
  const scraperFiles = allFiles.filter(file => 
    file.endsWith('.js') && 
    !file.includes('test') &&
    !file.includes('index') &&
    !file.includes('backup') &&
    !file.includes('.bak')
  );
  
  console.log(`📁 Found ${scraperFiles.length} NYC scrapers\n`);
  
  const results = { working: [], noEvents: [], errors: [] };
  
  for (const file of scraperFiles) {
    try {
      const scraperPath = path.join(scrapersDir, file);
      console.log(`🔍 Testing ${file}...`);
      
      const scraper = require(scraperPath);
      
      if (typeof scraper !== 'function') {
        console.log(`   ❌ Not a function`);
        results.errors.push({ file, error: 'Not a function' });
        continue;
      }
      
      const events = await scraper('New York');
      
      if (events && Array.isArray(events)) {
        if (events.length > 0) {
          console.log(`   ✅ ${events.length} events`);
          results.working.push({ file, count: events.length });
        } else {
          console.log(`   ⚠️  0 events`);
          results.noEvents.push(file);
        }
      } else {
        console.log(`   ❌ Invalid return`);
        results.errors.push({ file, error: 'Invalid return type' });
      }
      
    } catch (error) {
      console.log(`   ❌ ${error.message.substring(0, 50)}`);
      results.errors.push({ file, error: error.message.substring(0, 100) });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 NYC SCRAPERS ANALYSIS');
  console.log('='.repeat(60));
  console.log(`✅ Working with events: ${results.working.length}`);
  console.log(`⚠️  Working but 0 events: ${results.noEvents.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  console.log(`📁 Total: ${scraperFiles.length}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Error scrapers (${results.errors.length}):`);
    results.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }
  
  if (results.working.length > 0) {
    console.log(`\n✅ Working scrapers (${results.working.length}):`);
    results.working.slice(0, 10).forEach(({ file, count }) => {
      console.log(`   ${file}: ${count} events`);
    });
    if (results.working.length > 10) {
      console.log(`   ... and ${results.working.length - 10} more`);
    }
  }
  
  fs.writeFileSync('NYC_ANALYSIS.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Full analysis saved to NYC_ANALYSIS.json');
}

analyzeNYCScrapers().catch(console.error);
