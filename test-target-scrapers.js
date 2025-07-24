/**
 * Script to test specific Vancouver scrapers (Metropolis, The Cultch, Rickshaw Theatre)
 * Looks in both the main Vancouver directory and backup directory
 */

const fs = require('fs');
const path = require('path');

// Settings
const VANCOUVER_DIR = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
const BACKUP_DIR = path.join(VANCOUVER_DIR, 'backup');
const TEST_TIMEOUT = 60000; // 60 seconds timeout per scraper

// Target scrapers to test
const TARGET_SCRAPERS = [
  { name: 'Rickshaw Theatre', filePatterns: ['rickshaw', 'RickshawTheatre'] },
  { name: 'The Cultch', filePatterns: ['cultch', 'theCultch'] },
  { name: 'Metropolis at Metrotown', filePatterns: ['metropolis', 'MetropolisAt'] }
];

// Results tracking
const results = {
  found: [],
  notFound: [],
  successful: [],
  failed: [],
  totalEvents: 0
};

// Function to find all scraper files
function findScraperFiles() {
  console.log('Looking for scraper files...');
  
  const allFiles = [];
  
  // Look in main directory
  if (fs.existsSync(VANCOUVER_DIR)) {
    fs.readdirSync(VANCOUVER_DIR)
      .filter(file => file.endsWith('.js') && !file.startsWith('test-') && !file.startsWith('verify-'))
      .forEach(file => {
        allFiles.push({
          path: path.join(VANCOUVER_DIR, file),
          file: file,
          location: 'main'
        });
      });
  }
  
  // Look in backup directory
  if (fs.existsSync(BACKUP_DIR)) {
    fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.js'))
      .forEach(file => {
        allFiles.push({
          path: path.join(BACKUP_DIR, file),
          file: file,
          location: 'backup'
        });
      });
  }
  
  console.log(`Found ${allFiles.length} total .js files`);
  return allFiles;
}

// Function to filter for target scrapers
function findTargetScrapers(allFiles) {
  const targetFiles = [];
  
  TARGET_SCRAPERS.forEach(target => {
    console.log(`\nLooking for ${target.name} scrapers...`);
    let found = false;
    
    // Look for files matching the patterns
    const matchingFiles = allFiles.filter(file => {
      const lowerName = file.file.toLowerCase();
      return target.filePatterns.some(pattern => 
        lowerName.includes(pattern.toLowerCase()) && !lowerName.includes('test-')
      );
    });
    
    if (matchingFiles.length > 0) {
      console.log(`✅ Found ${matchingFiles.length} potential ${target.name} scrapers:`);
      matchingFiles.forEach(file => {
        console.log(`  - ${file.file} (${file.location})`);
        targetFiles.push({
          ...file,
          targetName: target.name
        });
      });
      found = true;
      results.found.push(target.name);
    } else {
      console.log(`❌ No ${target.name} scrapers found`);
      results.notFound.push(target.name);
    }
  });
  
  return targetFiles;
}

// Function to test a scraper
async function testScraper(scraperFile) {
  const start = Date.now();
  console.log(`\nTesting: ${scraperFile.file} for ${scraperFile.targetName}`);
  
  try {
    // Delete require cache to ensure fresh load
    delete require.cache[require.resolve(scraperFile.path)];
    
    // Import the scraper
    const scraper = require(scraperFile.path);
    
    // Log the module contents to help debug
    console.log('Module exports:', Object.keys(scraper));
    
    // Check if it has a scrape function
    if (!scraper || typeof scraper.scrape !== 'function') {
      console.log(`❌ ${scraperFile.file} does not have a scrape function`);
      return { 
        success: false, 
        error: 'No scrape function', 
        file: scraperFile.file,
        target: scraperFile.targetName,
        events: 0,
        duration: Date.now() - start
      };
    }
    
    // Log the scraper name if available
    if (scraper.name) {
      console.log(`Scraper name: ${scraper.name}`);
    }
    
    // Log the venue if available
    if (scraper.venue && scraper.venue.name) {
      console.log(`Venue: ${scraper.venue.name}`);
    }
    
    // Set up timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUT);
    });
    
    // Run the scrape function with timeout
    console.log('Running scrape() function...');
    const events = await Promise.race([
      scraper.scrape(),
      timeoutPromise
    ]);
    
    // Check if events is an array
    if (!events || !Array.isArray(events)) {
      console.log(`❌ ${scraperFile.file} did not return an array of events`);
      return { 
        success: false, 
        error: 'Invalid return value', 
        file: scraperFile.file,
        target: scraperFile.targetName,
        events: 0,
        duration: Date.now() - start
      };
    }
    
    // Success!
    console.log(`✅ ${scraperFile.file} returned ${events.length} events`);
    
    // Show sample events if available
    if (events.length > 0) {
      console.log('\nSample events:');
      events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`  Title: "${event.title || 'No title'}"`);
        console.log(`  Date: ${new Date(event.startDate || Date.now()).toLocaleDateString()}`);
        console.log(`  Venue: ${event.venue?.name || 'Unknown venue'}`);
        if (event.description) {
          console.log(`  Description: "${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}"`);
        }
      });
    }
    
    // Check for fallback usage
    const usedFallback = events.length > 0 && events[0]._fromFallback;
    if (usedFallback) {
      console.log(`⚠️ ${scraperFile.file} used FALLBACK data!`);
    }
    
    return { 
      success: true, 
      file: scraperFile.file,
      target: scraperFile.targetName,
      events: events.length,
      hasFallback: usedFallback,
      duration: Date.now() - start,
      sampleEvents: events.slice(0, 2)
    };
    
  } catch (error) {
    if (error.message === 'Timeout') {
      console.log(`⏰ ${scraperFile.file} timed out after ${TEST_TIMEOUT/1000} seconds`);
      return { 
        success: false, 
        error: 'Timed out', 
        timedOut: true,
        file: scraperFile.file,
        target: scraperFile.targetName,
        events: 0,
        duration: TEST_TIMEOUT
      };
    } else {
      console.log(`❌ ${scraperFile.file} error: ${error.message}`);
      console.log(error.stack);
      return { 
        success: false, 
        error: error.message,
        file: scraperFile.file,
        target: scraperFile.targetName,
        events: 0,
        duration: Date.now() - start
      };
    }
  }
}

// Main function
async function testTargetScrapers() {
  console.log('======================================================');
  console.log('TESTING TARGET VANCOUVER SCRAPERS');
  console.log(`Targets: ${TARGET_SCRAPERS.map(t => t.name).join(', ')}`);
  console.log('======================================================');
  
  const globalStart = Date.now();
  
  // Get all JS files
  const allFiles = findScraperFiles();
  
  // Filter for target scrapers
  const targetFiles = findTargetScrapers(allFiles);
  
  if (targetFiles.length === 0) {
    console.log('\n❌ No target scrapers found');
    return;
  }
  
  console.log(`\nFound ${targetFiles.length} target scrapers to test`);
  
  // Track detailed results
  const testResults = [];
  
  // Test each target scraper
  for (const file of targetFiles) {
    const result = await testScraper(file);
    testResults.push(result);
    
    // Track result
    if (result.success) {
      results.successful.push({
        name: file.file,
        target: file.targetName,
        events: result.events,
        hasFallback: result.hasFallback
      });
      results.totalEvents += result.events;
    } else {
      results.failed.push({
        name: file.file,
        target: file.targetName,
        error: result.error
      });
    }
  }
  
  const totalDuration = (Date.now() - globalStart) / 1000;
  
  // Print summary
  console.log('\n======================================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('======================================================');
  console.log(`Total target scrapers tested: ${targetFiles.length}`);
  console.log(`Successful: ${results.successful.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Total events found: ${results.totalEvents}`);
  console.log(`Time taken: ${totalDuration.toFixed(2)} seconds`);
  
  // Show successful scrapers
  if (results.successful.length > 0) {
    console.log('\n✅ Working target scrapers:');
    results.successful.forEach(scraper => {
      const fallbackIndicator = scraper.hasFallback ? ' (FALLBACK)' : '';
      console.log(`  - ${scraper.name} (${scraper.target}): ${scraper.events} events${fallbackIndicator}`);
    });
  }
  
  // Show failed scrapers
  if (results.failed.length > 0) {
    console.log('\n❌ Failed target scrapers:');
    results.failed.forEach(scraper => {
      console.log(`  - ${scraper.name} (${scraper.target}): ${scraper.error}`);
    });
  }
  
  // Show target summary
  console.log('\n🎯 Target venues summary:');
  TARGET_SCRAPERS.forEach(target => {
    const successfulForTarget = results.successful.filter(s => s.target === target.name);
    if (successfulForTarget.length > 0) {
      const totalEvents = successfulForTarget.reduce((sum, s) => sum + s.events, 0);
      console.log(`  ✅ ${target.name}: ${successfulForTarget.length} working scrapers, ${totalEvents} events`);
      successfulForTarget.forEach(s => console.log(`     - ${s.name}: ${s.events} events`));
    } else {
      console.log(`  ❌ ${target.name}: No working scrapers`);
    }
  });
  
  // Suggestions for next steps
  console.log('\n🔍 Recommendations:');
  if (results.notFound.length > 0) {
    console.log(`  - Create scrapers for: ${results.notFound.join(', ')}`);
  }
  if (results.failed.length > 0) {
    console.log('  - Fix the failed scrapers listed above');
  }
  
  // Save results to file
  const resultsLog = {
    summary: {
      targetsFound: results.found,
      targetsNotFound: results.notFound,
      successful: results.successful.length,
      failed: results.failed.length,
      totalEvents: results.totalEvents,
      date: new Date().toISOString(),
      duration: totalDuration
    },
    scrapers: {
      successful: results.successful,
      failed: results.failed
    },
    detailedResults: testResults
  };
  
  fs.writeFileSync('target-scraper-results.json', JSON.stringify(resultsLog, null, 2));
  console.log('\nDetailed results saved to target-scraper-results.json');
}

// Run the tests
testTargetScrapers().catch(error => {
  console.error('Error running tests:', error);
});
