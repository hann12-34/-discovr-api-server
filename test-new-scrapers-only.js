/**
 * Test Script for New Vancouver Event Scrapers
 * 
 * This script tests ONLY the newly created scrapers, not the entire collection
 */

// Import the new scrapers directly
const metropolisEvents = require('./scrapers/cities/vancouver/metropolisEvents');
const arcDiningEvents = require('./scrapers/cities/vancouver/arcDiningEvents');
const vancouverMysteriesEvents = require('./scrapers/cities/vancouver/vancouverMysteriesEvents');
const dragonBoatFestivalEvents = require('./scrapers/cities/vancouver/dragonBoatFestivalEvents');
const museumOfVancouverEvents = require('./scrapers/cities/vancouver/museumOfVancouverEvents');

// List of scrapers to test
const newScrapers = [
  metropolisEvents,
  arcDiningEvents,
  vancouverMysteriesEvents,
  dragonBoatFestivalEvents,
  museumOfVancouverEvents
];

/**
 * Test new scrapers only
 */
async function testNewScrapers() {
  console.log('🧪 TESTING NEW VANCOUVER SCRAPERS ONLY 🧪');
  console.log('=========================================\n');
  
  // Test results
  const results = {
    successful: 0,
    failed: 0,
    usingFallbacks: [],
    notUsingFallbacks: [],
    totalEvents: 0,
    errors: []
  };
  
  // Test each scraper sequentially
  for (const scraper of newScrapers) {
    console.log(`\n🔍 TESTING: ${scraper.name}`);
    console.log('-----------------------------------------------------');
    
    try {
      // Capture console output to detect fallback messages
      const originalConsoleLog = console.log;
      const logs = [];
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalConsoleLog(...args);
      };
      
      // Run the scraper
      const startTime = Date.now();
      const events = await scraper.scrape();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Restore original console
      console.log = originalConsoleLog;
      
      // Analyze results
      console.log(`\n✅ Success: Found ${events.length} events in ${duration} seconds.`);
      
      // Check for fallback indicators in logs
      const usingFallback = logs.some(log => 
        log.toLowerCase().includes('fallback') || 
        log.toLowerCase().includes('no events found') ||
        log.toLowerCase().includes('creating projected') ||
        log.toLowerCase().includes('default dates')
      );
      
      if (usingFallback) {
        results.usingFallbacks.push(scraper.name);
        console.log('⚠️ This scraper is using fallback logic.');
        
        // Find fallback-related messages
        const fallbackMessages = logs.filter(log => 
          log.toLowerCase().includes('fallback') || 
          log.toLowerCase().includes('no events found') ||
          log.toLowerCase().includes('creating projected') ||
          log.toLowerCase().includes('default dates')
        );
        
        if (fallbackMessages.length > 0) {
          console.log('Fallback evidence:');
          fallbackMessages.forEach(msg => console.log(`  > ${msg.trim()}`));
        }
      } else {
        results.notUsingFallbacks.push(scraper.name);
        console.log('✅ This scraper is using live data extraction.');
      }
      
      // Display sample event
      if (events.length > 0) {
        console.log('\nSample event data:');
        console.log(JSON.stringify(events[0], null, 2));
      }
      
      results.successful++;
      results.totalEvents += events.length;
      
    } catch (error) {
      console.error(`❌ ERROR: ${error.message}`);
      results.failed++;
      results.errors.push({
        scraper: scraper.name,
        error: error.message
      });
    }
  }
  
  // Output summary
  console.log('\n\n=========================================');
  console.log('🧪 TEST RESULTS SUMMARY 🧪');
  console.log('=========================================');
  console.log(`Total new scrapers tested: ${newScrapers.length}`);
  console.log(`✅ Successful scrapers: ${results.successful}`);
  console.log(`❌ Failed scrapers: ${results.failed}`);
  console.log(`📊 Total events found: ${results.totalEvents}`);
  console.log(`\n🔍 Scrapers using live data (${results.notUsingFallbacks.length}):`);
  results.notUsingFallbacks.forEach(name => console.log(`  ✓ ${name}`));
  console.log(`\n⚠️ Scrapers using fallbacks (${results.usingFallbacks.length}):`);
  results.usingFallbacks.forEach(name => console.log(`  ⚠️ ${name}`));
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERROR DETAILS:');
    results.errors.forEach(e => console.log(`  ${e.scraper}: ${e.error}`));
  }
  
  console.log('\n=========================================');
}

// Run all tests
testNewScrapers();
