// This script tests the refactored Toronto scrapers by running them sequentially.
require('../../../temp-env-config');
const { scrapeMOCAEevents } = require('./scrape-moca-events.js');
const { scrapeBloorWestVillageEvents } = require('./scrape-bloorwestvillage-events.js');


const city = 'Toronto';

(async () => {
  console.log(`--- Starting test run for ${city} scrapers ---`);

  try {
    console.log('\n--- Testing MOCA Scraper ---');
        await scrapeMOCAEevents(city);
    console.log('--- MOCA Scraper Test Complete ---');
  } catch (e) {
    console.error('MOCA scraper test failed:', e);
  }

  try {
    console.log('\n--- Testing Bloor West Village Scraper ---');
    await scrapeBloorWestVillageEvents(city);
    console.log('--- Bloor West Village Scraper Test Complete ---');
  } catch (e) {
    console.error('Bloor West Village scraper test failed:', e);
  }


  console.log(`\n--- All tests for ${city} scrapers complete ---`);
  process.exit(0); // Exit gracefully
})();
