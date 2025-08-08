const { getCityFromArgs } = require('../../utils/city-util.js');
const fs = require('fs');
const path = require('path');

const vancouverScrapersDir = __dirname;

// List of files to exclude from running
const excludeFiles = [
  'run_all_scrapers.js', // Exclude self
  'index.js', // Usually an entry point, not a scraper
];

const scraperPrefixesToExclude = ['import-', 'test-', 'run-'];

async function runAllScrapers() {
  console.log('Starting to run all Vancouver scrapers...');
  const files = fs.readdirSync(vancouverScrapersDir);

  const scraperFiles = files.filter(file => {
    const isJsFile = file.endsWith('.js');
    const isExcluded = excludeFiles.includes(file);
    const hasExcludedPrefix = scraperPrefixesToExclude.some(prefix => file.startsWith(prefix));
    const isDirectory = fs.statSync(path.join(vancouverScrapersDir, file)).isDirectory();

    return isJsFile && !isExcluded && !hasExcludedPrefix && !isDirectory;
  });

  console.log(`Found ${scraperFiles.length} scrapers to run.`);

  for (const file of scraperFiles) {
    const scraperPath = path.join(vancouverScrapersDir, file);
    try {
      const ScraperClass = require(scraperPath);
      
      // Check if it's a class
      if (typeof ScraperClass !== 'function' || !/^[A-Z]/.test(ScraperClass.name)) {
        console.log(`- Skipping ${file} (not a valid scraper class).`);
        continue;
      }

      console.log(`--- Running scraper: ${file} ---`);
      const scraper = new ScraperClass({ debug: false, logEvents: false });

      if (typeof scraper.scrape !== 'function') {
        console.log(`- ${file} does not have a 'scrape' method. Skipping.`);
        continue;
      }

      const events = await scraper.scrape();
      console.log(`- ✅ ${file}: Found ${events.length} events.`);

    } catch (error) {
      console.error(`- ❌ Error running scraper ${file}:`, error.message);
    }
    console.log('------------------------------------\n');
  }

  console.log('All scrapers have been run.');
}

runAllScrapers();
