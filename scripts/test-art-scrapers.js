/**
 * Test script for art gallery scrapers
 * 
 * Usage:
 * - Test all scrapers: node test-art-scrapers.js
 * - Test specific scraper: node test-art-scrapers.js <scraperName>
 *   Example: node test-art-scrapers.js "Vancouver Art Gallery"
 */

const seymourArtGallery = require('../scrapers/venues/new/seymourArtGallery');
const kootenayGallery = require('../scrapers/venues/new/kootenayGallery');
const sumGallery = require('../scrapers/venues/new/sumGallery');
const capturePhotographyFestival = require('../scrapers/venues/new/capturePhotographyFestival');
const vancouverArtGallery = require('../scrapers/venues/new/vancouverArtGallery');

const scrapers = [
  seymourArtGallery,
  kootenayGallery,
  sumGallery,
  capturePhotographyFestival,
  vancouverArtGallery
];

// Helper function to print event info
function printEventSummary(event) {
  console.log(`- "${event.name}" [${event.startDate || 'no date'} to ${event.endDate || 'no end date'}]`);
  console.log(`  Venue: ${event.venue.name}, ${event.venue.address}`);
  console.log(`  URL: ${event.url}`);
  console.log(`  Description: ${event.description ? event.description.substring(0, 100) + '...' : 'No description'}`);
  console.log();
}

// Run a specific scraper
async function runScraper(scraper) {
  console.log(`\n========================================`);
  console.log(`TESTING SCRAPER: ${scraper.name}`);
  console.log(`Source URL: ${scraper.url}`);
  console.log(`========================================\n`);
  
  try {
    console.time('Scrape time');
    const events = await scraper.scrape();
    console.timeEnd('Scrape time');
    
    console.log(`\nScraper returned ${events.length} events\n`);
    
    if (events.length > 0) {
      console.log('SAMPLE EVENTS:');
      // Print first 2 events (or all if less than 2)
      const samplesToShow = Math.min(events.length, 2);
      for (let i = 0; i < samplesToShow; i++) {
        printEventSummary(events[i]);
      }
      
      // Print date statistics
      const eventsWithStartDates = events.filter(e => e.startDate).length;
      const eventsWithEndDates = events.filter(e => e.endDate).length;
      const eventsWithNoDates = events.filter(e => !e.startDate && !e.endDate).length;
      
      console.log('DATE STATISTICS:');
      console.log(`- Events with start dates: ${eventsWithStartDates} (${Math.round(eventsWithStartDates/events.length*100)}%)`);
      console.log(`- Events with end dates: ${eventsWithEndDates} (${Math.round(eventsWithEndDates/events.length*100)}%)`);
      console.log(`- Events with no dates: ${eventsWithNoDates} (${Math.round(eventsWithNoDates/events.length*100)}%)`);
      console.log();
    }
    
    return {
      name: scraper.name,
      success: true,
      count: events.length,
      error: null
    };
  } catch (error) {
    console.error(`ERROR with ${scraper.name}:`, error);
    return {
      name: scraper.name,
      success: false,
      count: 0,
      error: error.message
    };
  }
}

// Main function
async function main() {
  const results = [];
  
  // Check if a specific scraper was requested
  const requestedScraperName = process.argv[2];
  
  if (requestedScraperName) {
    // Find and run the requested scraper
    const scraper = scrapers.find(
      s => s.name.toLowerCase() === requestedScraperName.toLowerCase()
    );
    
    if (scraper) {
      results.push(await runScraper(scraper));
    } else {
      console.error(`Scraper '${requestedScraperName}' not found. Available scrapers are:`);
      scrapers.forEach(s => console.log(`- "${s.name}"`));
      process.exit(1);
    }
  } else {
    // Run all scrapers
    console.log(`Testing all ${scrapers.length} art gallery scrapers...\n`);
    
    for (const scraper of scrapers) {
      results.push(await runScraper(scraper));
    }
  }
  
  // Print summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalEvents = results.reduce((total, r) => total + r.count, 0);
  
  console.log(`Total events found: ${totalEvents}`);
  console.log(`Successful scrapers: ${successful.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\nFailed scrapers:');
    failed.forEach(f => {
      console.log(`- ${f.name}: ${f.error}`);
    });
  }
}

// Run the main function
main().catch(console.error);
