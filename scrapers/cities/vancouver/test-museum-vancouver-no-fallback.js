/**
 * Test script for Museum of Vancouver Paddle Carving Events scraper
 * After removing fallback logic
 */

const museumOfVancouverEvents = require('./scrapers/cities/vancouver/museumOfVancouverEvents');

async function testScraper() {
  console.log('🔍 Testing Museum of Vancouver Paddle Carving Events scraper without fallbacks...');
  
  try {
    // Detect fallback usage by monitoring console output
    const originalConsoleLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalConsoleLog(...args);
    };
    
    // Run the scraper
    const events = await museumOfVancouverEvents.scrape();
    
    // Restore original console
    console.log = originalConsoleLog;
    
    // Check for fallback usage
    const usingFallback = logs.some(log => 
      log.toLowerCase().includes('fallback') || 
      log.toLowerCase().includes('projected') ||
      log.toLowerCase().includes('default dates')
    );
    
    if (usingFallback) {
      console.log('⚠️ WARNING: This scraper is still using fallback data somehow!');
    } else {
      console.log('✅ Successfully using live data extraction only');
    }
    
    // Output stats
    console.log(`Found ${events.length} events`);
    
    // Display first event as sample if any found
    if (events.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
    } else {
      console.log('No events found - no fallbacks were used.');
    }
    
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
  }
}

// Run the test
testScraper();
