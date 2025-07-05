/**
 * Comprehensive Test Script for All Vancouver Scrapers
 * 
 * This script tests all scrapers in the Vancouver index and provides detailed diagnostics:
 * - Checks which scrapers run successfully
 * - Detects which scrapers are using fallbacks vs. live data
 * - Provides stats on event extraction
 */

const vancouverScrapers = require('./scrapers/cities/vancouver');

/**
 * Test all scrapers with detailed diagnostics
 */
async function testAllScrapers() {
  console.log('🧪 STARTING COMPREHENSIVE SCRAPER TESTS 🧪');
  console.log('=========================================\n');
  
  // Get all scrapers
  const scrapers = vancouverScrapers.scrapers;
  console.log(`Found ${scrapers.length} scrapers to test.\n`);
  
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
  for (const scraper of scrapers) {
    console.log(`\n🔍 TESTING: ${scraper.name} (${scraper.sourceIdentifier})`);
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
        results.usingFallbacks.push({name: scraper.name, sourceIdentifier: scraper.sourceIdentifier});
        console.log('⚠️ WARNING: This scraper appears to be using fallback logic.');
        
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
        results.notUsingFallbacks.push({name: scraper.name, sourceIdentifier: scraper.sourceIdentifier});
        console.log('✅ GREAT: This scraper appears to be using live data extraction.');
      }
      
      // Basic validation of event data
      if (events.length > 0) {
        // Check for key fields in a sample event
        const sampleEvent = events[0];
        const requiredFields = ['id', 'title', 'startDate', 'venue', 'category'];
        const missingFields = requiredFields.filter(field => !sampleEvent[field]);
        
        if (missingFields.length > 0) {
          console.log(`⚠️ WARNING: Sample event is missing fields: ${missingFields.join(', ')}`);
        } else {
          console.log('✅ Event data validation: All required fields present.');
        }
      }
      
      results.successful++;
      results.totalEvents += events.length;
      
    } catch (error) {
      console.error(`❌ ERROR: ${error.message}`);
      results.failed++;
      results.errors.push({
        scraper: scraper.name,
        sourceIdentifier: scraper.sourceIdentifier,
        error: error.message
      });
    }
  }
  
  // Output summary
  console.log('\n\n=========================================');
  console.log('🧪 TEST RESULTS SUMMARY 🧪');
  console.log('=========================================');
  console.log(`Total scrapers tested: ${scrapers.length}`);
  console.log(`✅ Successful scrapers: ${results.successful}`);
  console.log(`❌ Failed scrapers: ${results.failed}`);
  console.log(`📊 Total events found: ${results.totalEvents}`);
  console.log(`\n🔍 Scrapers using live data (${results.notUsingFallbacks.length}):`);
  results.notUsingFallbacks.forEach(s => console.log(`  ✓ ${s.name}`));
  console.log(`\n⚠️ Scrapers using fallbacks (${results.usingFallbacks.length}):`);
  results.usingFallbacks.forEach(s => console.log(`  ⚠️ ${s.name}`));
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERROR DETAILS:');
    results.errors.forEach(e => console.log(`  ${e.scraper}: ${e.error}`));
  }
  
  console.log('\n=========================================');
}

// Run all tests
testAllScrapers();
