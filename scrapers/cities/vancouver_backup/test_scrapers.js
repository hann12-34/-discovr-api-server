/**
 * Vancouver Scraper Test Script
 * 
 * This script will test each scraper in the directory with proper error
 * handling and timeout protection.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TIMEOUT_MS = 60000; // 1 minute timeout per scraper
const LOG_FILE = 'scraper_tests_results.json';
const DIRECTORY = __dirname;

// Helper function to run a scraper with timeout
async function runScraperWithTimeout(ScraperClass, timeoutMs) {
  return new Promise((resolve) => {
    const scraper = new ScraperClass();
    const scraperName = scraper.name || scraper.constructor.name;
    
    console.log(`\n🔍 Testing ${scraperName} scraper...`);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });
    
    // Run the scraper
    const scraperPromise = scraper.scrape().then(events => {
      console.log(`✅ ${scraperName}: Found ${events.length} events`);
      return {
        success: true,
        name: scraperName,
        events: events.length,
        error: null
      };
    }).catch(error => {
      console.error(`❌ ${scraperName}: Error: ${error.message}`);
      return {
        success: false,
        name: scraperName,
        events: 0,
        error: error.message
      };
    });
    
    // Race between the scraper and the timeout
    Promise.race([scraperPromise, timeoutPromise])
      .then(resolve)
      .catch(error => {
        console.error(`❌ ${scraperName}: ${error.message}`);
        resolve({
          success: false,
          name: scraperName,
          events: 0,
          error: error.message
        });
      });
  });
}

// Main function
async function main() {
  console.log('🚀 Starting Vancouver scrapers test...');
  
  // Get all JavaScript files in the directory
  const files = fs.readdirSync(DIRECTORY).filter(file => 
    file.endsWith('.js') && 
    !file.startsWith('test_') && 
    !file.startsWith('run_') && 
    !file.includes('check_') &&
    !file.includes('list_') &&
    !file.includes('fix_')
  );
  
  const results = {
    timestamp: new Date().toISOString(),
    directory: DIRECTORY,
    summary: {
      total: 0,
      successful: 0,
      failed: 0,
      eventsTotal: 0
    },
    scrapers: []
  };
  
  console.log(`Found ${files.length} JavaScript files to test`);
  
  // Process each file
  for (const file of files) {
    const filePath = path.join(DIRECTORY, file);
    
    try {
      // Import the scraper module
      const ScraperModule = require(filePath);
      
      // Check if it's a valid scraper class
      if (typeof ScraperModule === 'function' && 
          ScraperModule.prototype.scrape && 
          typeof ScraperModule.prototype.scrape === 'function') {
        
        // Run the scraper with timeout protection
        const result = await runScraperWithTimeout(ScraperModule, TIMEOUT_MS);
        
        // Update results
        results.scrapers.push({
          file,
          ...result
        });
        
        // Update summary
        results.summary.total++;
        if (result.success) {
          results.summary.successful++;
          results.summary.eventsTotal += result.events;
        } else {
          results.summary.failed++;
        }
      } else {
        console.log(`⏩ Skipping ${file}: Not a valid scraper class`);
      }
    } catch (error) {
      console.error(`❌ Error importing ${file}: ${error.message}`);
      results.scrapers.push({
        file,
        success: false,
        name: file,
        events: 0,
        error: `Import error: ${error.message}`
      });
      results.summary.total++;
      results.summary.failed++;
    }
  }
  
  // Save results to file
  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`Total scrapers: ${results.summary.total}`);
  console.log(`Successful: ${results.summary.successful}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Total events found: ${results.summary.eventsTotal}`);
  console.log(`\nDetailed results saved to ${LOG_FILE}`);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
