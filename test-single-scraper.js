const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Get the scraper name from command line arguments or use default
const scraperToTest = process.argv[2] || 'scrape-lepointdevente.js';
// ---------------------

const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'Montreal', scraperToTest);

if (!fs.existsSync(scraperPath)) {
  console.error(`Scraper file not found: ${scraperPath}`);
  process.exit(1);
}

const runTest = async () => {
  console.log(`============================================================`);
  console.log(`--- Attempting to run scraper: ${scraperToTest} ---`);
  console.log(`============================================================`);

  try {
    // Dynamically require the scraper
    const ScraperModule = require(scraperPath);
    let scraperInstance;

    // Handle both class-based and object-literal scrapers
    if (typeof ScraperModule === 'function' && ScraperModule.prototype.scrape) {
      scraperInstance = new ScraperModule();
    } else if (typeof ScraperModule === 'object' && ScraperModule !== null) {
      scraperInstance = ScraperModule;
    } else {
      throw new Error('Scraper export is not a class constructor or an object literal.');
    }

    if (!scraperInstance || typeof scraperInstance.scrape !== 'function') {
      throw new Error('Scraper instance is invalid or does not have a scrape method.');
    }

    console.log(`Scraper '${scraperInstance.name}' instantiated successfully. Running scrape()...`);
    const events = await scraperInstance.scrape();

    console.log(`\n------------------------------------------------------------`);
    console.log(`✅ Scraper '${scraperInstance.name}' finished successfully.`);
    console.log(`   Processed ${events.length} events.`);
    console.log(`------------------------------------------------------------\n`);

    if (events.length > 0) {
      console.log('Sample event:', JSON.stringify(events[0], null, 2));
    }

    // Ensure the output directory exists
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, `${path.basename(scraperToTest, '.js')}-results.json`);
    fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
    console.log(`Results saved to ${outputPath}`);

  } catch (error) {
    console.error(`\n❌ A critical error occurred in the test runner for ${scraperToTest}:`);
    console.error(error);
    process.exit(1); // Exit with an error code to indicate failure
  }
};

runTest();
