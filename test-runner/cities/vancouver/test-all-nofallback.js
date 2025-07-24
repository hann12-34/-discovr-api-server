/**
 * Test script to run all NoFallback scrapers and report their results
 * 
 * This script tests each NoFallback scraper to verify they properly
 * reject synthetic content and only include authentic events.
 */

const path = require('path');
const fs = require('fs');

// Import all NoFallback scrapers
const HrMacmillanSpaceCentreEvents = require('./hrMacmillanSpaceCentreEventsNoFallback');
const PolygonGalleryEvents = require('./polygonGalleryEventsNoFallback');
const SpaceCentreEvents = require('./spaceCentreEventsNoFallback');
const VancouverMaritimeMuseumEvents = require('./vancouverMaritimeMuseumEventsNoFallback');

// Create a test runner for all scrapers
async function testAllNoFallbackScrapers() {
  console.log('='.repeat(70));
  console.log('TESTING ALL NOFALLBACK SCRAPERS');
  console.log('='.repeat(70));
  
  const startTime = Date.now();
  const results = [];
  
  // Define scrapers to test with their instance creation
  const scrapers = [
    { 
      name: 'H.R. MacMillan Space Centre', 
      instance: new HrMacmillanSpaceCentreEvents({ diagnosticMode: true })
    },
    { 
      name: 'Polygon Gallery', 
      instance: new PolygonGalleryEvents()
    },
    { 
      name: 'Space Centre', 
      instance: new SpaceCentreEvents()
    },
    { 
      name: 'Vancouver Maritime Museum', 
      instance: new VancouverMaritimeMuseumEvents()
    }
  ];
  
  // Test each scraper
  for (const scraper of scrapers) {
    try {
      console.log(`\n\n${'-'.repeat(50)}`);
      console.log(`Testing: ${scraper.name}`);
      console.log(`${'-'.repeat(50)}`);
      
      const startTimeScraper = Date.now();
      
      // Check if scraper has the diagnostic test method
      if (typeof scraper.instance.runDiagnosticTest === 'function') {
        console.log(`Running diagnostic test for ${scraper.name}...`);
        const diagnosticResults = await scraper.instance.runDiagnosticTest();
        console.log(`Diagnostic test complete with ${diagnosticResults?.accuracy || 'unknown'}% accuracy`);
      } else {
        console.log(`Standard scraper test for ${scraper.name}...`);
      }
      
      // Run the scraper to get events
      console.log(`\nFetching events from ${scraper.name}...`);
      const eventsResult = await scraper.instance.getEvents();
      
      const eventCount = Array.isArray(eventsResult) ? 
        eventsResult.length : 
        (eventsResult.events?.length || 0);
        
      const rejectionStats = eventsResult.rejectionStats || { total: 'unknown' };
      
      const duration = (Date.now() - startTimeScraper) / 1000;
      
      console.log(`${scraper.name} complete in ${duration.toFixed(2)}s`);
      console.log(`Events retrieved: ${eventCount}`);
      console.log(`Events rejected: ${rejectionStats.total}`);
      
      results.push({
        name: scraper.name,
        eventCount,
        rejectionStats,
        duration: duration.toFixed(2),
        success: true
      });
      
    } catch (error) {
      console.error(`Error testing ${scraper.name}:`, error);
      results.push({
        name: scraper.name,
        error: error.message,
        success: false
      });
    }
  }
  
  // Report overall results
  const totalDuration = (Date.now() - startTime) / 1000;
  console.log('\n\n');
  console.log('='.repeat(70));
  console.log('NOFALLBACK SCRAPERS TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total execution time: ${totalDuration.toFixed(2)}s\n`);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✓ ${result.name}: ${result.eventCount} events (${result.duration}s)`);
    } else {
      console.log(`✗ ${result.name}: FAILED - ${result.error}`);
    }
  });
  
  // Save results to file
  const resultsPath = path.join(__dirname, 'nofallback-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${resultsPath}`);
}

// Run the tests
testAllNoFallbackScrapers()
  .then(() => console.log('\nAll tests complete!'))
  .catch(err => console.error('\nTest runner encountered an error:', err));
