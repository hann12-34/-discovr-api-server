const fs = require('fs');
const path = require('path');

async function analyzeCalgaryScrapers() {
  console.log('🔍 Analyzing Calgary scrapers...\n');
  
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Calgary');
  const allFiles = fs.readdirSync(scrapersDir);
  const scraperFiles = allFiles.filter(file => 
    file.endsWith('.js') && 
    !file.includes('test') &&
    !file.includes('index') &&
    !file.includes('boilerplate')
  );
  
  console.log(`📁 Found ${scraperFiles.length} Calgary scrapers\n`);
  
  const results = {
    working: [],
    syntaxErrors: [],
    runtimeErrors: [],
    noEvents: []
  };
  
  for (const file of scraperFiles) {
    try {
      const scraperPath = path.join(scrapersDir, file);
      console.log(`🔍 Testing ${file}...`);
      
      const scraper = require(scraperPath);
      
      if (typeof scraper !== 'function') {
        console.log(`   ❌ Not a function`);
        results.syntaxErrors.push({ file, error: 'Not a function' });
        continue;
      }
      
      const events = await scraper('Calgary');
      
      if (events && Array.isArray(events)) {
        if (events.length > 0) {
          console.log(`   ✅ ${events.length} events`);
          results.working.push({ file, count: events.length });
        } else {
          console.log(`   ⚠️  0 events`);
          results.noEvents.push(file);
        }
      } else {
        console.log(`   ❌ Invalid return type`);
        results.runtimeErrors.push({ file, error: 'Invalid return type' });
      }
      
    } catch (error) {
      console.log(`   ❌ ${error.message.substring(0, 50)}`);
      if (error.message.includes('Unexpected')) {
        results.syntaxErrors.push({ file, error: error.message.substring(0, 100) });
      } else {
        results.runtimeErrors.push({ file, error: error.message.substring(0, 100) });
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 CALGARY SCRAPERS ANALYSIS');
  console.log('='.repeat(60));
  console.log(`✅ Working with events: ${results.working.length}`);
  console.log(`⚠️  Working but 0 events: ${results.noEvents.length}`);
  console.log(`❌ Syntax errors: ${results.syntaxErrors.length}`);
  console.log(`❌ Runtime errors: ${results.runtimeErrors.length}`);
  
  if (results.syntaxErrors.length > 0) {
    console.log('\n🐛 SYNTAX ERRORS:');
    results.syntaxErrors.forEach(item => {
      console.log(`   ${item.file}`);
      console.log(`      ${item.error}`);
    });
  }
  
  if (results.working.length > 0) {
    console.log('\n✅ WORKING SCRAPERS:');
    results.working.forEach(item => {
      console.log(`   ${item.file}: ${item.count} events`);
    });
  }
  
  fs.writeFileSync('CALGARY_ANALYSIS.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Full analysis saved to CALGARY_ANALYSIS.json');
}

analyzeCalgaryScrapers().catch(console.error);
