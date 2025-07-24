/**
 * Quick Validation of Fixed Scrapers
 * Minimal script to verify our fixes worked
 */

// List of key scrapers to test
const TEST_SCRAPERS = [
  'undergroundComedyClubEvents.js',
  'canadaPlaceEvents.js'
];

console.log('🔍 Testing key scrapers to validate fixes...\n');

// Test a single scraper and report results
async function testScraper(scraperFile) {
  console.log(`Testing ${scraperFile}...`);
  
  try {
    // Try to require the scraper
    const scraper = require(`./${scraperFile}`);
    console.log(`✅ Successfully imported ${scraperFile}`);
    
    // Check for scrape method
    if (typeof scraper.scrape !== 'function') {
      console.log(`❌ ${scraperFile} does not have a scrape method`);
      return false;
    }
    console.log(`✅ Found scrape method in ${scraperFile}`);
    
    // Check other expected properties
    if (!scraper.name) {
      console.log(`⚠️ Warning: ${scraperFile} has no name property`);
    } else {
      console.log(`ℹ️ Scraper name: ${scraper.name}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error importing ${scraperFile}: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  let success = 0;
  let failure = 0;
  
  for (const scraper of TEST_SCRAPERS) {
    const result = await testScraper(scraper);
    if (result) {
      success++;
    } else {
      failure++;
    }
    console.log(''); // Empty line for readability
  }
  
  console.log(`📊 Summary: ${success} success, ${failure} failure`);
}

main().catch(console.error);
