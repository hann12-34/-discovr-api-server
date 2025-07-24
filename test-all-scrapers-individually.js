const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');

// A more carefully selected list of files that are likely to be scrapers
const scraperFiles = fs.readdirSync(scrapersDir).filter(file => {
  return file.endsWith('.js') && 
         !file.startsWith('test-') && 
         !file.startsWith('run_') && 
         !file.startsWith('fix_') &&
         !file.startsWith('check_') &&
         !file.startsWith('list_') &&
         !file.startsWith('master_') &&
         !file.startsWith('standardize_') &&
         !file.startsWith('validate_') &&
         !file.startsWith('verify-') &&
         !file.includes('.backup.') &&
         !file.includes('.fixed.') &&
         file !== 'index.js';
});

async function runScrapers() {
  console.log(`Found ${scraperFiles.length} potential scrapers to test.`);

  for (const file of scraperFiles) {
    const scraperPath = path.join(scrapersDir, file);
    console.log(`\n============================================================`);
    console.log(`--- Attempting to run scraper: ${file} ---`);
    console.log(`============================================================`);

    try {
      const ScraperModule = require(scraperPath);
      let scraper;

      // Handle different module export styles
      if (typeof ScraperModule === 'function') {
        // Handles `module.exports = class ...`
        scraper = new ScraperModule();
      } else if (typeof ScraperModule === 'object' && ScraperModule !== null) {
        // Handles `module.exports = new Scraper()` or `module.exports = { ... }`
        if (typeof ScraperModule.scrape === 'function') {
            scraper = ScraperModule;
        } else {
            // Look for a class property, e.g. `module.exports = { ScraperClass: ... }`
            const key = Object.keys(ScraperModule).find(k => typeof ScraperModule[k] === 'function');
            if (key) {
                const ScraperClass = ScraperModule[key];
                scraper = new ScraperClass();
            } else {
                throw new Error('Module is an object, but no scraper class or instance could be found.');
            }
        }
      } else {
        throw new Error('Scraper module is not a class or an object.');
      }

      if (typeof scraper.scrape !== 'function') {
        throw new Error('The scraper instance does not have a scrape() method.');
      }

      console.log(`Scraper '${scraper.name || file}' instantiated successfully. Running scrape()...`);
      const events = await scraper.scrape();
      
      console.log(`--- ✅ SUCCESS: ${file} ---`);
      console.log(`Found ${events.length} events.`);
      if (events.length > 0) {
        console.log('Sample event:');
        console.log(JSON.stringify(events[0], null, 2));
      }
      console.log('------------------------------------------------------------');

    } catch (error) {
      console.error(`--- ❌ ERROR running scraper from ${file} ---`);
      console.error(error.message);
      console.error(error.stack);
      console.error('------------------------------------------------------------');
    }
  }
}

runScrapers();
