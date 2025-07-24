/**
 * Test Runner for Fixed Vancouver Scrapers
 * Tests the newly fixed Vancouver venue scrapers
 */

const fs = require('fs');
const path = require('path');

// Import the fixed scrapers
const PublicLibraryEvents = require('../restored-scrapers/cities/vancouver/publicLibraryEvents');
const OrpheumTheatreEvents = require('../restored-scrapers/cities/vancouver/orpheumTheatreEvents');
const PneEvents = require('../restored-scrapers/cities/vancouver/pneEvents');
const MansionNightclubEventsScraper = require('../restored-scrapers/cities/vancouver/mansionNightclubEvents');
const BarNoneEventsScraper = require('../restored-scrapers/cities/vancouver/barNoneEvents');
const YaletownMusicEventsScraper = require('../restored-scrapers/cities/vancouver/yaletownMusicEvents');
const TwelveWestEventsScraper = require('../restored-scrapers/cities/vancouver/twelveWestEvents');

// Instantiate class-based scrapers
const MansionNightclubEvents = new MansionNightclubEventsScraper();
const BarNoneEvents = new BarNoneEventsScraper();
const YaletownMusicEvents = new YaletownMusicEventsScraper();
const TwelveWestEvents = new TwelveWestEventsScraper();

// Create debug directory if it doesn't exist
const debugDir = path.join(__dirname, '..', 'debug');
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

// Parse command line arguments
const args = process.argv.slice(2);
const scraperName = args[0]; // Optional specific scraper to test

// Map of scrapers to test
const scrapers = {
  'public-library': PublicLibraryEvents,
  'orpheum-theatre': OrpheumTheatreEvents,
  'pne-events': PneEvents,
  'mansion-nightclub': MansionNightclubEvents,
  'bar-none': BarNoneEvents,
  'yaletown-music': YaletownMusicEvents,
  'twelve-west': TwelveWestEvents
};

/**
 * Run a single scraper and return the events
 */
async function runScraper(name, scraper) {
  console.log(`\n=== Testing ${name} ===`);
  
  try {
    console.log(`Running ${name} scraper...`);
    const events = await scraper.scrape();
    
    if (events && events.length > 0) {
      console.log(`✅ SUCCESS: ${name} returned ${events.length} events`);
      
      // Save results to debug directory
      const resultsPath = path.join(debugDir, `${name}-results-${Date.now()}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify(events, null, 2));
      console.log(`Results saved to ${resultsPath}`);
      
      // Display first event as sample
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
      
      return events;
    } else {
      console.log(`⚠️ WARNING: ${name} returned 0 events`);
      return [];
    }
  } catch (error) {
    console.error(`❌ FAILED: ${name} - ${error.message}`);
    console.error(error.stack);
    return [];
  }
}

/**
 * Run all scrapers or a specific one
 */
async function runTests() {
  console.log('=== Fixed Vancouver Scrapers Test Runner ===');
  console.log(`Current date for reference: ${new Date().toISOString()}`);
  
  // If specific scraper provided, only run that one
  if (scraperName && scrapers[scraperName]) {
    return await runScraper(scraperName, scrapers[scraperName]);
  } 
  
  // Otherwise run all scrapers
  const results = {
    successful: [],
    failed: [],
    totalEvents: 0
  };
  
  for (const [name, scraper] of Object.entries(scrapers)) {
    try {
      const events = await runScraper(name, scraper);
      if (events && events.length > 0) {
        results.successful.push({ name, count: events.length });
        results.totalEvents += events.length;
      } else {
        results.failed.push({ name, reason: 'No events returned' });
      }
    } catch (error) {
      results.failed.push({ name, reason: error.message });
    }
  }
  
  // Output summary
  console.log('\n=== Test Results Summary ===');
  console.log(`Total events found: ${results.totalEvents}`);
  console.log(`Successful scrapers: ${results.successful.length}/${Object.keys(scrapers).length}`);
  console.log('Successful scrapers:');
  results.successful.forEach(s => console.log(`- ${s.name}: ${s.count} events`));
  
  if (results.failed.length > 0) {
    console.log('Failed scrapers:');
    results.failed.forEach(f => console.log(`- ${f.name}: ${f.reason}`));
  }
  
  return results;
}

// Run the tests
runTests().catch(console.error);
