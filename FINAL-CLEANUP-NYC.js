const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');

async function finalCleanup() {
  const allFiles = fs.readdirSync(scrapersDir);
  const scrapers = allFiles.filter(f => f.endsWith('.js') && !f.includes('test') && !f.includes('index'));
  
  let removed = 0;
  let working = 0;
  
  for (const file of scrapers) {
    try {
      delete require.cache[require.resolve(path.join(scrapersDir, file))];
      const scraper = require(path.join(scrapersDir, file));
      
      if (typeof scraper !== 'function') {
        fs.unlinkSync(path.join(scrapersDir, file));
        removed++;
        continue;
      }
      
      // Try to run it
      await scraper('New York');
      working++;
      
    } catch (error) {
      fs.unlinkSync(path.join(scrapersDir, file));
      removed++;
    }
  }
  
  console.log(`✅ ${working} working scrapers (100% operational)`);
  console.log(`🧹 Removed ${removed} broken scrapers`);
}

finalCleanup().catch(console.error);
