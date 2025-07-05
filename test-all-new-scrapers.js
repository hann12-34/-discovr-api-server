/**
 * Combined test script for all new Vancouver event scrapers
 * 
 * This script runs and tests all the newly created scrapers in sequence
 */

const japanMarketScraper = require('./scrapers/cities/vancouver/japanMarketEvents');
const vsffScraper = require('./scrapers/cities/vancouver/vsffEvents');
const runToEndEndoScraper = require('./scrapers/cities/vancouver/runToEndEndoEvents');
const chineseGardenScraper = require('./scrapers/cities/vancouver/chineseGardenEvents');
const musqueamScraper = require('./scrapers/cities/vancouver/musqueamEvents');

// Set a longer timeout for each scraper (3 minutes)
const SCRAPER_TIMEOUT = 180000;

/**
 * Test a single scraper with timeout protection
 */
async function testScraper(scraper) {
  console.log(`\n🧪 Testing ${scraper.name} scraper...`);
  console.log(`🔍 URL: ${scraper.url}`);
  
  // Create a promise that will resolve with the scraper results
  const scraperPromise = scraper.scrape();
  
  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Scraper timed out after ${SCRAPER_TIMEOUT/1000} seconds`)), SCRAPER_TIMEOUT);
  });
  
  try {
    // Race the scraper against the timeout
    const events = await Promise.race([scraperPromise, timeoutPromise]);
    
    console.log(`✅ Found ${events.length} events`);
    
    if (events.length > 0) {
      // Print sample event data
      console.log('\nSample event:');
      const sampleEvent = events[0];
      
      // Check for required fields
      const requiredFields = ['id', 'title', 'startDate', 'endDate', 'venue'];
      const missingFields = requiredFields.filter(field => !sampleEvent[field]);
      
      if (missingFields.length > 0) {
        console.error(`⚠️ WARNING: Sample event is missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Print the event in a readable format
      console.log(`Title: ${sampleEvent.title}`);
      console.log(`Date: ${new Date(sampleEvent.startDate).toLocaleString()} - ${new Date(sampleEvent.endDate).toLocaleString()}`);
      console.log(`Venue: ${sampleEvent.venue.name}`);
      console.log(`Description: ${sampleEvent.description ? sampleEvent.description.substring(0, 100) + '...' : 'No description'}`);
      
      // Print total event count
      if (events.length > 1) {
        console.log(`\nOther event dates:`);
        events.slice(1, Math.min(5, events.length)).forEach((event, i) => {
          console.log(`${i+2}. ${event.title} - ${new Date(event.startDate).toLocaleDateString()}`);
        });
        
        if (events.length > 5) {
          console.log(`... and ${events.length - 5} more events`);
        }
      }
    } else {
      console.log('⚠️ No events found. Check the scraper implementation.');
    }
    
    return {
      name: scraper.name,
      success: true,
      eventCount: events.length
    };
  } catch (error) {
    console.error(`❌ Error testing ${scraper.name}: ${error.message}`);
    return {
      name: scraper.name,
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting tests for all new Vancouver scrapers');
  console.log('=============================================');
  
  const scrapers = [
    japanMarketScraper,
    vsffScraper,
    runToEndEndoScraper,
    chineseGardenScraper,
    musqueamScraper
  ];
  
  const results = [];
  
  // Run each scraper test in sequence
  for (const scraper of scrapers) {
    const result = await testScraper(scraper);
    results.push(result);
    console.log('\n---------------------------------------------\n');
  }
  
  // Print summary
  console.log('📊 Test Results Summary:');
  console.log('=============================================');
  
  let successCount = 0;
  let failCount = 0;
  let totalEvents = 0;
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}: Success - ${result.eventCount} events`);
      successCount++;
      totalEvents += result.eventCount;
    } else {
      console.log(`❌ ${result.name}: Failed - ${result.error}`);
      failCount++;
    }
  });
  
  console.log('=============================================');
  console.log(`📈 Overall: ${successCount}/${results.length} scrapers successful`);
  console.log(`📦 Total events found: ${totalEvents}`);
  
  if (failCount > 0) {
    console.log(`⚠️ ${failCount} scrapers failed - check logs above for details`);
    process.exit(1);
  } else {
    console.log('🎉 All scrapers passed successfully!');
  }
}

// Run all tests
runAllTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
