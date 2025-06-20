/**
 * Script to test all venue scrapers
 * Runs each scraper, validates the results, and compares with expected counts
 */

const { scrapers, runScraper } = require('../scrapers');
const axios = require('axios');
const cheerio = require('cheerio');
const colors = require('colors/safe');

// If colors isn't installed, install it first
try {
  require.resolve('colors');
} catch (e) {
  console.log('Installing required dependencies...');
  require('child_process').execSync('npm install colors --no-save');
  console.log('Dependencies installed successfully.\n');
}

// Map of venues to expected event count methods
// This helps us validate that we're getting the correct number of events
const venueValidation = {
  'Commodore Ballroom': {
    url: 'https://www.commodoreballroom.com/events',
    countSelector: '.event-list .event',
    name: 'commodoreBallroom'
  },
  'Fox Cabaret': {
    url: 'https://www.foxcabaret.com/',
    countSelector: '.event-list .event',
    name: 'foxCabaret'
  },
  'Vogue Theatre': {
    url: 'https://voguetheatre.com/calendar/',
    countSelector: '.event-row',
    name: 'vogueTheatre'
  },
  'Fortune Sound Club': {
    url: 'https://fortunesoundclub.com/calendar/',
    countSelector: '.list-view .vevent',
    name: 'fortuneSoundClub'
  },
  'Orpheum Theatre': {
    url: 'https://www.vancouvercivictheatres.com/venues/orpheum-theatre/',
    countSelector: '.event-list .event',
    name: 'orpheumTheatre'
  },
  'Rickshaw Theatre': {
    url: 'https://www.rickshawtheatre.com/events/',
    countSelector: '.event',
    name: 'rickshawTheatre'
  },
  'Rogers Arena': {
    url: 'https://rogersarena.com/events/',
    countSelector: '.event-item',
    name: 'rogersArena'
  },
  'Queen Elizabeth Theatre': {
    url: 'https://www.vancouvercivictheatres.com/venues/queen-elizabeth-theatre/',
    countSelector: '.event-list .event',
    name: 'queenElizabethTheatre'
  },
  'The Living Room': {
    url: 'https://livingroombar.ca/',
    countSelector: '.event',
    name: 'livingRoom' 
  },
  'The Pearl Vancouver': {
    url: 'https://www.thepearlvancouver.com/',
    countSelector: '.event',
    name: 'pearlVancouver'
  },
  'Penthouse Nightclub': {
    url: 'https://www.penthousenightclub.ca/',
    countSelector: '.event',
    name: 'penthouseNightclub'
  },
  'The Cultch': {
    url: 'https://thecultch.com/shows/',
    countSelector: '.show-item',
    name: 'theCultch'
  },
  'Aura Vancouver': {
    url: 'https://auranightclub.ca/',
    countSelector: '.event-item',
    name: 'auraVancouver'
  },
  'Twelve West': {
    url: 'https://twelvewest.ca/collections/upcoming-events',
    countSelector: '.product-card',
    name: 'twelveWest'
  },
  'Celebrities Nightclub': {
    url: 'https://www.celebritiesnightclub.com/',
    countSelector: '.event-card',
    name: 'celebritiesNightclub'
  },
  'Bar None': {
    url: 'https://www.barnoneclub.com/',
    countSelector: '.event',
    name: 'barNone'
  },
  'Mansion Club': {
    url: 'https://mansionclub.ca/collections/upcoming-events',
    countSelector: '.product-card',
    name: 'mansionClub'
  }
};

/**
 * Check the actual event count on a venue website
 * @param {string} url - Venue website URL
 * @param {string} selector - CSS selector for events
 * @returns {Promise<number>} - Actual event count
 */
async function checkActualEventCount(url, selector) {
  try {
    console.log(`Checking actual events at ${url} using selector "${selector}"...`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const elements = $(selector);
    
    console.log(`Found ${elements.length} events on the actual website`);
    return elements.length;
  } catch (error) {
    console.error(`Error checking actual event count: ${error.message}`);
    return -1; // Error indicator
  }
}

/**
 * Test a single scraper
 * @param {string} scraperName - Name of the scraper to test
 * @returns {Promise<Object>} - Test results
 */
async function testScraper(scraperName) {
  console.log(`\n===== Testing ${scraperName} =====`);
  
  try {
    // Run the scraper
    const events = await runScraper(scraperName);
    console.log(`Scraper returned ${events.length} events`);
    
    // Find the venue in our validation map
    const venue = Object.values(venueValidation).find(v => v.name.toLowerCase() === scraperName.toLowerCase());
    
    // Check the actual event count on the website if we have venue configuration
    let actualCount = 'unknown';
    let status = 'functional';
    
    if (venue) {
      try {
        actualCount = await checkActualEventCount(venue.url, venue.countSelector);
        
        // Analyze results
        if (actualCount === -1) {
          status = 'error checking website';
        } else if (events.length === actualCount) {
          status = 'matched';
        } else if (events.length > 0 && actualCount === 0) {
          // Our scraper found events but the selector didn't - might need updating
          status = 'selector may need updating';
        } else if (events.length === 1 && actualCount === 0) {
          // This is likely a fallback event
          status = 'using fallback event';
        } else if (events.length < actualCount) {
          status = 'missing events';
        } else if (events.length > actualCount) {
          status = 'extra events found';
        }
      } catch (error) {
        console.error(`Error checking actual event count for ${scraperName}:`, error);
        actualCount = 'error';
        status = 'error checking website';
      }
    } else {
      console.log(`No validation configuration for ${scraperName}`);
      
      // Determine if we're getting a fallback event
      if (events.length === 1 && events[0].title && events[0].title.startsWith('Visit')) {
        status = 'using fallback event';
      } else if (events.length > 0) {
        status = 'functional';
      } else {
        status = 'no events';
      }
    }
    
    // If we got events, validate their structure
    const validationIssues = [];
    if (events.length > 0) {
      events.forEach((event, i) => {
        if (!event.title) validationIssues.push(`Event ${i} missing title`);
        if (!event.venue || !event.venue.name) validationIssues.push(`Event ${i} missing venue name`);
        if (!event.description) validationIssues.push(`Event ${i} missing description`);
      });
    }
    
    // Check a random event for structure if there are multiple
    if (events.length > 1) {
      const sampleEvent = events[Math.floor(Math.random() * events.length)];
      console.log('\nSample event:');
      console.log(`- Title: ${sampleEvent.title || 'MISSING'}`); 
      console.log(`- Venue: ${sampleEvent.venue?.name || 'MISSING'}`); 
      console.log(`- Date: ${sampleEvent.startDate ? new Date(sampleEvent.startDate).toDateString() : 'MISSING'}`);
    }
    
    return {
      name: scraperName,
      scrapedCount: events.length,
      actualCount,
      status,
      validationIssues: validationIssues.length > 0 ? validationIssues : 'none'
    };
  } catch (error) {
    console.error(`Error testing scraper ${scraperName}:`, error);
    return { 
      name: scraperName, 
      scrapedCount: 0, 
      actualCount: 'unknown',
      status: 'error', 
      error: error.message
    };
  }
}

/**
 * Run tests for all scrapers
 */
async function testAllScrapers() {
  console.log('Starting scraper tests...');
  const results = [];
  
  // Get list of all scrapers
  const scraperNames = scrapers.map(scraper => scraper.name);
  console.log(`Found ${scraperNames.length} scrapers to test`);
  
  // Test each scraper sequentially
  for (const name of scraperNames) {
    const result = await testScraper(name);
    results.push(result);
  }
  
  // Print summary table
  console.log('\n===== SCRAPER TEST RESULTS =====');
  console.log('Scraper Name'.padEnd(30) + ' | ' + 
              'Scraped'.padEnd(10) + ' | ' + 
              'Actual'.padEnd(10) + ' | ' + 
              'Status'.padEnd(25) + ' | ' + 
              'Validation');
  
  console.log('-'.repeat(100));
  
  results.forEach(result => {
    console.log(
      result.name.padEnd(30) + ' | ' + 
      String(result.scrapedCount).padEnd(10) + ' | ' + 
      String(result.actualCount).padEnd(10) + ' | ' + 
      result.status.padEnd(25) + ' | ' + 
      (result.validationIssues === 'none' ? 'Valid' : 'Issues found')
    );
  });
  
  // Simplify reporting with color coding
  const issuesFound = results.filter(r => 
    r.status !== 'matched' && 
    r.status !== 'using fallback event' &&
    r.validationIssues !== 'none'
  );
  
  // Report on each scraper with color coding
  console.log('\n===== DETAILED SCRAPER ANALYSIS =====');
  results.forEach(result => {
    // Determine status color
    let statusColor;
    if (result.status === 'matched') {
      statusColor = colors.green;
    } else if (result.status === 'using fallback event') {
      statusColor = colors.yellow;
    } else {
      statusColor = colors.red;
    }
    
    console.log(colors.cyan(`\n${result.name}:`));
    console.log(`  - Events: ${result.scrapedCount > 0 ? colors.green(result.scrapedCount) : colors.red(result.scrapedCount)}`);
    
    // More detailed info based on actual scraper performance
    if (result.scrapedCount > 0) {
      console.log('  - Event structure validation: ' + 
        (result.validationIssues === 'none' ? colors.green('PASSED') : colors.red('FAILED')));
      
      if (result.validationIssues !== 'none') {
        result.validationIssues.forEach(issue => {
          console.log(colors.red(`    * ${issue}`));
        });
      }
    }
    
    // Show scraper status
    console.log(`  - Status: ${statusColor(result.status)}`);
    
    if (result.error) {
      console.log(colors.red(`  - Error: ${result.error}`));
    }
  });
  
  // Summary
  console.log('\n===== SUMMARY =====');
  const working = results.filter(r => r.scrapedCount > 0 && r.validationIssues === 'none').length;
  const usingFallback = results.filter(r => r.scrapedCount === 1 && r.status === 'using fallback event').length;
  const problematic = results.filter(r => r.validationIssues !== 'none' || r.status === 'error').length;
  
  console.log(`${colors.green(`${working}`)} of ${results.length} scrapers are fully functional`);
  console.log(`${colors.yellow(`${usingFallback}`)} scrapers using fallback events`);
  
  if (problematic > 0) {
    console.log(colors.red(`${problematic} scrapers need attention`));
  } else {
    console.log(colors.green('All scrapers are delivering valid events!'));
  }
}

// Run the tests
testAllScrapers().catch(error => {
  console.error('Error running tests:', error);
});
