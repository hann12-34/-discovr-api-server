/**
 * Test Priority Vancouver Venues
 * 
 * This script specifically tests scrapers for high-priority venue websites
 * to ensure they're properly working with current website structures.
 */

const fs = require('fs');
const path = require('path');

// Map of venue names to their corresponding scraper files
const VENUE_SCRAPERS = {
  'Commodore Ballroom': 'commodoreBallroomEvents.js',
  'Fox Cabaret': 'foxCabaret.js',
  'Fortune Sound Club': 'fortuneSoundClub.js',
  'Orpheum Theatre': 'orpheumTheatre.js',
  'The Rickshaw Theatre': 'rickshawTheatreEvents.js',
  'Rogers Arena': 'rogersArena.js',
  'The Vogue Theatre': 'vogueTheatre.js',
  'Queen Elizabeth Theatre': 'queenElizabethTheatre.js',
  'Celebrities Nightclub': 'celebritiesNightclub.js',
  'Bar None Club': 'barNoneClub.js',
  'The Roxy': null // Need to find or create this scraper
};

// Map of venue URLs for verification
const VENUE_URLS = {
  'Commodore Ballroom': 'https://www.commodoreballroom.com/shows',
  'Fox Cabaret': 'https://www.foxcabaret.com/monthly-calendar',
  'Fortune Sound Club': 'https://www.fortunesoundclub.com/events',
  'Orpheum Theatre': 'https://vancouvercivictheatres.com/events/',
  'The Rickshaw Theatre': 'https://www.rickshawtheatre.com/',
  'Rogers Arena': 'https://www.rogersarena.com/',
  'The Vogue Theatre': 'https://voguetheatre.com/events',
  'Queen Elizabeth Theatre': 'https://vancouvercivictheatres.com/venues/queen-elizabeth-theatre/events',
  'The Living Room': 'https://www.the-livingroom.ca/whats-on',
  'The Pearl': 'https://thepearlvancouver.com/all-shows/',
  'Penthouse Nightclub': 'http://www.penthousenightclub.com/events/',
  'The Cultch': 'https://thecultch.com/whats-on/',
  'Twelve West': 'https://twelvewest.ca/collections/upcoming-events',
  'Celebrities Nightclub': 'https://www.celebritiesnightclub.com/',
  'Bar None Club': 'https://www.barnoneclub.com/',
  'Mansion Club': 'https://mansionclub.ca/collections/upcoming-events',
  'The Roxy': 'https://www.roxyvan.com/events'
};

// Main function
async function main() {
  console.log('🚀 Testing Priority Vancouver Venue Scrapers\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      total: Object.keys(VENUE_SCRAPERS).length,
      available: 0,
      working: 0,
      failed: 0
    },
    details: []
  };
  
  // Process each venue
  for (const [venue, scraperFile] of Object.entries(VENUE_SCRAPERS)) {
    console.log(`\n📍 Checking ${venue}...`);
    console.log(`🔗 Website: ${VENUE_URLS[venue] || 'URL not specified'}`);
    
    const result = {
      venue,
      url: VENUE_URLS[venue],
      scraperFile,
      scraperExists: false,
      hasScrapingFunction: false,
      success: false,
      events: 0,
      error: null,
      duration: 0
    };
    
    // Check if scraper exists
    if (!scraperFile) {
      console.log(`❌ No scraper file defined for ${venue}`);
      result.error = 'No scraper file defined';
      results.details.push(result);
      continue;
    }
    
    const scraperPath = path.join(__dirname, scraperFile);
    if (!fs.existsSync(scraperPath)) {
      console.log(`❌ Scraper file not found: ${scraperFile}`);
      result.error = 'Scraper file not found';
      results.details.push(result);
      continue;
    }
    
    result.scraperExists = true;
    results.summary.available++;
    
    try {
      // Import the scraper
      const startTime = Date.now();
      const scraper = require(scraperPath);
      console.log(`✅ Successfully imported ${scraperFile}`);
      
      // Check for scrape method
      if (typeof scraper.scrape !== 'function') {
        console.log(`❌ ${scraperFile} does not have a scrape method`);
        result.error = 'No scrape method available';
        results.details.push(result);
        continue;
      }
      
      result.hasScrapingFunction = true;
      console.log(`✅ Found scrape method in ${scraperFile}`);
      
      // Try to run the scraper with a timeout of 30 seconds
      console.log(`🔄 Running scraper for ${venue}...`);
      try {
        const events = await Promise.race([
          scraper.scrape(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timed out after 30 seconds')), 30000)
          )
        ]);
        
        const endTime = Date.now();
        result.duration = endTime - startTime;
        
        // Process results
        console.log(`✅ ${venue}: Found ${events.length} events (${Math.round(result.duration / 1000)}s)`);
        
        result.success = true;
        result.events = events.length;
        results.summary.working++;
        
      } catch (runError) {
        const endTime = Date.now();
        result.duration = endTime - startTime;
        console.log(`❌ Error running scraper for ${venue}: ${runError.message}`);
        result.error = `Runtime error: ${runError.message}`;
        results.summary.failed++;
      }
      
    } catch (importError) {
      console.log(`❌ Error importing ${scraperFile}: ${importError.message}`);
      result.error = `Import error: ${importError.message}`;
      results.summary.failed++;
    }
    
    results.details.push(result);
  }
  
  // Calculate success rate
  results.summary.successRate = results.summary.available > 0 
    ? Math.round((results.summary.working / results.summary.available) * 100) 
    : 0;
  
  // Print summary
  console.log('\n📊 Test Results Summary:');
  console.log(`Total venues checked: ${results.summary.total}`);
  console.log(`Scrapers available: ${results.summary.available}`);
  console.log(`Working scrapers: ${results.summary.working}`);
  console.log(`Failed scrapers: ${results.summary.failed}`);
  console.log(`Success rate: ${results.summary.successRate}%`);
  
  // Print details for quick reference
  console.log('\n📋 Quick Results:');
  results.details.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const eventCount = result.success ? `${result.events} events` : result.error;
    console.log(`${status} ${result.venue}: ${eventCount}`);
  });
  
  // Save results to file
  const resultsFile = 'priority_venues_test.json';
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to ${resultsFile}`);
  
  // Suggest fixes for venues without scrapers
  const missingScrapers = Object.entries(VENUE_SCRAPERS)
    .filter(([_, file]) => !file)
    .map(([venue]) => venue);
    
  if (missingScrapers.length > 0) {
    console.log('\n⚠️ The following venues need scrapers created:');
    missingScrapers.forEach(venue => {
      console.log(`- ${venue} (${VENUE_URLS[venue] || 'URL not specified'})`);
    });
  }
  
  // List venues in the URL list but not in scraper map
  const unmappedVenues = Object.keys(VENUE_URLS)
    .filter(venue => !VENUE_SCRAPERS.hasOwnProperty(venue));
    
  if (unmappedVenues.length > 0) {
    console.log('\n📝 The following venues have URLs but no corresponding scrapers:');
    unmappedVenues.forEach(venue => {
      console.log(`- ${venue} (${VENUE_URLS[venue]})`);
    });
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
