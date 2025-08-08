const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Test Fixed Scrapers
 * 
 * This script tests the scrapers that were previously failing due to export format issues
 * to verify that our standardization fixes worked correctly.
 */

const fs = require('fs');
const path = require('path');

// List of previously failing scrapers that we've fixed
const FIXED_SCRAPERS = [
  'undergroundComedyClubEvents.js',
  'canadaPlaceEvents.js'
];

// Main function
async function main() {
  console.log('🚀 Testing fixed scrapers...');
  
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      total: FIXED_SCRAPERS.length,
      successful: 0,
      failed: 0,
      eventsTotal: 0
    },
    scrapers: []
  };
  
  // Process each fixed scraper
  for (const scraperFile of FIXED_SCRAPERS) {
    const scraperPath = path.join(__dirname, scraperFile);
    console.log(`\n🔍 Testing ${scraperFile}...`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(scraperPath)) {
        throw new Error('Scraper file not found');
      }
      
      // Import the scraper
      const scraper = require(scraperPath);
      console.log(`✅ Successfully imported ${scraperFile}`);
      
      // Check if it has a scrape method
      if (typeof scraper.scrape !== 'function') {
        throw new Error('No scrape method found');
      }
      console.log(`✅ Scrape method found in ${scraperFile}`);
      
      // Try to run the scraper with a timeout of 10 seconds
      console.log(`🔄 Running scraper ${scraperFile}...`);
      const events = await Promise.race([
        scraper.scrape(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timed out after 10 seconds')), 10000)
        )
      ]);
      
      // Process results
      console.log(`✅ ${scraperFile}: Found ${events.length} events`);
      
      results.scrapers.push({
        file: scraperFile,
        success: true,
        events: events.length,
        error: null
      });
      
      results.summary.successful++;
      results.summary.eventsTotal += events.length;
      
    } catch (error) {
      console.error(`❌ Error testing ${scraperFile}: ${error.message}`);
      
      results.scrapers.push({
        file: scraperFile,
        success: false,
        events: 0,
        error: error.message
      });
      
      results.summary.failed++;
    }
    
    // Wait a bit between scrapers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`Total fixed scrapers tested: ${results.summary.total}`);
  console.log(`Successful: ${results.summary.successful}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Total events found: ${results.summary.eventsTotal}`);
  
  // Save results to file
  fs.writeFileSync('fixed_scrapers_test_results.json', JSON.stringify(results, null, 2));
  console.log('\nDetailed results saved to fixed_scrapers_test_results.json');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
