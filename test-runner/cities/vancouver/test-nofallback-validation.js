/**
 * Space Centre Events No-Fallback Validation Test
 * 
 * This script tests the enhanced validation capabilities of the
 * Space Centre events scraper with no fallbacks enabled.
 */

const SpaceCentreEvents = require('./hrMacmillanSpaceCentreEventsNoFallback');

async function runTest() {
  console.log('=== SPACE CENTRE EVENTS NO-FALLBACK VALIDATION TEST ===');
  console.log(`Test started at: ${new Date().toISOString()}\n`);

  // Create a scraper instance with diagnostic mode enabled
  const scraper = new SpaceCentreEvents({ 
    diagnosticMode: true,
    strictValidation: true
  });

  // Run the diagnostic test
  try {
    // Test mode 1: Synthetic events only
    console.log('\n[TEST 1] Running with synthetic test events only...');
    const syntheticResults = await scraper.runDiagnosticTest({ 
      useRealEvents: false
    });
    
    // Test mode 2: With some real events (if requested)
    const includeRealEvents = process.argv.includes('--include-real');
    if (includeRealEvents) {
      console.log('\n[TEST 2] Running with both synthetic and real events...');
      const mixedResults = await scraper.runDiagnosticTest({ 
        useRealEvents: true, 
        maxEvents: 3
      });
      
      console.log(`\nReal events accuracy metrics: ${JSON.stringify(mixedResults.qualityMetrics || {}, null, 2)}`);
    }
    
    console.log('\nTest completed successfully!');
    
    // If any test events were incorrectly processed, show details
    if (syntheticResults.syntheticIncorrectlyPassed.length > 0) {
      console.log('\n⚠️ Events that should have been rejected but weren\'t:');
      syntheticResults.syntheticIncorrectlyPassed.forEach(event => {
        console.log(`- "${event.title}": ${event.description?.substring(0, 50)}...`);
      });
    }
    
    if (syntheticResults.syntheticIncorrectlyRejected.length > 0) {
      console.log('\n⚠️ Events that should have passed but were rejected:');
      syntheticResults.syntheticIncorrectlyRejected.forEach(event => {
        console.log(`- "${event.title}": ${event.description?.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('Error running validation test:', error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);
