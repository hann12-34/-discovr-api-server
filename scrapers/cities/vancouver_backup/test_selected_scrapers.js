/**
 * Test Selected Vancouver Scrapers
 * 
 * This script tests a curated list of scrapers that are likely to be actual scrapers
 * rather than testing all files in the directory.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const TIMEOUT_MS = 30000; // 30 seconds timeout per scraper
const LOG_FILE = 'selected_scrapers_results.json';
const DIRECTORY = __dirname;

// List of files that we know are actual scrapers or likely to be scrapers
// Focusing on ones that had events in previous runs
const SELECTED_SCRAPERS = [
  // Known working scrapers
  'fortuneSoundClub.js',
  'biltmoreCabaret.js',
  'celebritiesNightclub.js',
  'harbourEventCentre.js',
  'barNoneClub.js', 
  'canadaPlaceEvents.js',
  'gastownSundaySet.js',
  'undergroundComedyClubEvents.js',
  
  // Other potential scrapers
  'commodoreBallroom.js',
  'orpheumTheatre.js',
  'queenElizabethTheatre.js',
  'rickshawTheatre.js',
  'vancouverArtGallery.js',
  'vancouverJazzFestival.js',
  'vancouverSymphony.js',
  'vogueTheatre.js',
  'helloBCEventsScraper.js'
];

// Helper function to run a scraper with timeout
async function runScraperWithTimeout(scraperPath, timeoutMs) {
  return new Promise(async (resolve) => {
    try {
      // Import the scraper module
      const scraper = require(scraperPath);
      const scraperName = scraper.name || scraper.constructor.name || path.basename(scraperPath, '.js');
      
      console.log(`\n🔍 Testing ${scraperName} scraper...`);
      
      // Create a timeout promise
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Timeout after ${timeoutMs / 1000} seconds`));
        }, timeoutMs);
      });
      
      // Run the scraper
      const scraperPromise = scraper.scrape()
        .then(events => {
          clearTimeout(timeoutId);
          console.log(`✅ ${scraperName}: Found ${events.length} events`);
          return {
            success: true,
            name: scraperName,
            events: events.length,
            error: null
          };
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.error(`❌ ${scraperName}: Error: ${error.message}`);
          return {
            success: false,
            name: scraperName,
            events: 0,
            error: error.message
          };
        });
      
      // Race between the scraper and the timeout
      try {
        const result = await Promise.race([scraperPromise, timeoutPromise]);
        resolve(result);
      } catch (error) {
        console.error(`❌ ${scraperName}: ${error.message}`);
        resolve({
          success: false,
          name: scraperName,
          events: 0,
          error: error.message
        });
      }
    } catch (importError) {
      console.error(`❌ Import error for ${path.basename(scraperPath)}: ${importError.message}`);
      resolve({
        success: false,
        name: path.basename(scraperPath, '.js'),
        events: 0,
        error: `Import error: ${importError.message}`
      });
    }
  });
}

// Main function
async function main() {
  console.log('🚀 Starting selected Vancouver scrapers test...');
  
  const results = {
    timestamp: new Date().toISOString(),
    directory: DIRECTORY,
    summary: {
      total: SELECTED_SCRAPERS.length,
      successful: 0,
      failed: 0,
      eventsTotal: 0
    },
    scrapers: []
  };
  
  // Set up a shared browser instance for efficiency
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    console.log('Launched browser for tests');
  } catch (browserError) {
    console.error('Failed to launch browser:', browserError);
    // Continue without shared browser - each scraper will launch its own
  }
  
  // Process each selected scraper
  for (const file of SELECTED_SCRAPERS) {
    const filePath = path.join(DIRECTORY, file);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⏩ Skipping ${file}: File does not exist`);
      results.scrapers.push({
        file,
        success: false,
        name: path.basename(file, '.js'),
        events: 0,
        error: 'File does not exist'
      });
      continue;
    }
    
    // Run the scraper with timeout protection
    const result = await runScraperWithTimeout(filePath, TIMEOUT_MS);
    
    // Update results
    results.scrapers.push({
      file,
      ...result
    });
    
    // Update summary
    if (result.success) {
      results.summary.successful++;
      results.summary.eventsTotal += result.events;
    } else {
      results.summary.failed++;
    }
    
    // Short delay between scrapers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Close shared browser if it was created
  if (browser) {
    await browser.close();
    console.log('Closed shared browser');
  }
  
  // Save results to file
  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`Total scrapers tested: ${results.summary.total}`);
  console.log(`Successful: ${results.summary.successful}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Total events found: ${results.summary.eventsTotal}`);
  
  console.log('\n🔍 Details:');
  results.scrapers.forEach(scraper => {
    if (scraper.success) {
      console.log(`✅ ${scraper.name}: ${scraper.events} events`);
    } else {
      console.log(`❌ ${scraper.name}: ${scraper.error}`);
    }
  });
  
  console.log(`\nDetailed results saved to ${LOG_FILE}`);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
