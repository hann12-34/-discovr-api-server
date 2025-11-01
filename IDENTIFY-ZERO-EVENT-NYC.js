const fs = require('fs');
const path = require('path');

async function identifyZeroEventScrapers() {
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');
  const allFiles = fs.readdirSync(scrapersDir);
  const scrapers = allFiles.filter(f => f.endsWith('.js') && !f.includes('test') && !f.includes('index'));
  
  const zeroEventScrapers = [];
  const workingScrapers = [];
  
  for (const file of scrapers) {
    try {
      delete require.cache[require.resolve(path.join(scrapersDir, file))];
      const scraper = require(path.join(scrapersDir, file));
      const events = await scraper('New York');
      
      if (!events || events.length === 0) {
        zeroEventScrapers.push(file);
      } else {
        workingScrapers.push({ file, count: events.length });
      }
    } catch (e) {
      // Already cleaned
    }
  }
  
  console.log(`✅ Working: ${workingScrapers.length}`);
  console.log(`⚠️  Zero events: ${zeroEventScrapers.length}`);
  console.log(`\n🎯 Need to fix ${zeroEventScrapers.length} scrapers\n`);
  
  console.log('Zero-event scrapers:');
  zeroEventScrapers.slice(0, 20).forEach(f => console.log(`   - ${f}`));
  if (zeroEventScrapers.length > 20) console.log(`   ... and ${zeroEventScrapers.length - 20} more`);
  
  fs.writeFileSync('NYC_ZERO_EVENTS.json', JSON.stringify(zeroEventScrapers, null, 2));
}

identifyZeroEventScrapers().catch(console.error);
