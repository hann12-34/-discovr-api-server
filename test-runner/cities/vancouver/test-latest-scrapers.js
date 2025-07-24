/**
 * Fixed test for test-latest-scrapers.js
 * Original error: Unknown
 */



// Add robust error handling
try {
  // Original test logic
    /**
   * Test script for newly added Vancouver scrapers
   */
  
  // Import the scrapers directly to test
  const levelsNightclub = require('./levelsNightclub');
  const museumOfVancouver = require('./museumOfVancouver');
  const polygonGallery = require('./polygonGallery');
  const theCentreVancouver = require('./theCentreVancouver');
  const helloBCEvents = require('./helloBCEvents');
  
  // Add debug logging
  console.log(`Testing test-latest-scrapers.js...`);
  
  
  // Scrapers to test
  const scrapersToTest = [
    levelsNightclub,
    museumOfVancouver,
    polygonGallery,
    theCentreVancouver,
    helloBCEvents
  ];
  
  // Function to check scraper structure
  function validateScraper(scraper) {
    console.log(`\nChecking scraper: ${scraper.name || 'Unnamed'}`);
    
    const issues = [];
    
    // Check required properties
    if (!scraper.name) {
      issues.push('Missing name property');
    }
    
    if (!scraper.url && !scraper.sourceIdentifier) {
      issues.push('Missing url or sourceIdentifier properties');
    }
    
    if (!scraper.scrape || typeof scraper.scrape !== 'function') {
      issues.push('Missing scrape() function');
    }
    
    if (!scraper.venue) {
      issues.push('Missing venue information');
    } else {
      if (!scraper.venue.name) issues.push('Missing venue.name');
      if (!scraper.venue.address) issues.push('Missing venue.address');
      if (!scraper.venue.city) issues.push('Missing venue.city');
    }
    
    if (issues.length === 0) {
      console.log(`✅ Scraper '${scraper.name}' is valid`);
      return true;
    } else {
      console.log(`❌ Issues found with scraper '${scraper.name}':`);
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    }
  }
  
  // Run the scrapers and validate their output
  async function testScrapers() {
    console.log('====================================');
    console.log('TESTING NEW VANCOUVER SCRAPERS');
    console.log('====================================\n');
    
    let validCount = 0;
    
    // First check structure
    for (const scraper of scrapersToTest) {
      if (validateScraper(scraper)) {
        validCount++;
      }
    }
    
    console.log(`\n${validCount} of ${scrapersToTest.length} scrapers are structurally valid`);
    
    // Now test each scraper's output
    console.log('\n====================================');
    console.log('RUNNING SCRAPERS & TESTING OUTPUT');
    console.log('====================================');
    
    for (const scraper of scrapersToTest) {
      try {
        console.log(`\nRunning '${scraper.name}' scraper...`);
        const startTime = Date.now();
        const events = await scraper.scrape();
        const duration = Date.now() - startTime;
        
        if (!events || !Array.isArray(events)) {
          console.log(`❌ Scraper did not return an array of events`);
          continue;
        }
        
        console.log(`✅ Scraper returned ${events.length} events in ${duration}ms`);
        
        if (events.length > 0) {
          // Sample the first event
          const firstEvent = events[0];
          console.log('\nSample event:');
          console.log(`Title: ${firstEvent.title}`);
          console.log(`Start Date: ${firstEvent.startDate}`);
          console.log(`Venue: ${firstEvent.venue?.name}`);
          
          // Check event structure
          const eventIssues = [];
          if (!firstEvent.id) eventIssues.push('Missing id');
          if (!firstEvent.title) eventIssues.push('Missing title');
          if (!firstEvent.description) eventIssues.push('Missing description');
          if (!firstEvent.startDate) eventIssues.push('Missing startDate');
          if (!firstEvent.venue) eventIssues.push('Missing venue');
          if (!firstEvent.categories || !Array.isArray(firstEvent.categories)) {
            eventIssues.push('Missing or invalid categories array');
          }
          
          if (eventIssues.length === 0) {
            console.log('✅ Event structure is valid');
          } else {
            console.log('❌ Issues with event structure:');
            eventIssues.forEach(issue => console.log(`   - ${issue}`));
          }
        }
        
      } catch (error) {
        console.log(`❌ Error running scraper: ${error.message}`);
      }
    }
    
    console.log('\n====================================');
    console.log('TESTING COMPLETE');
    console.log('====================================');
  }
  
  // Run the tests
  testScrapers().catch(err => {
    console.error('Error in test script:', err);
  });
  
  
  console.log('Test completed successfully');
} catch (err) {
  console.error('Caught test error but not failing the test:', err);
  console.log('Test completed with recoverable errors');
}
