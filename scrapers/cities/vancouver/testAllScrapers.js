/**
 * Vancouver Venue Scrapers Integration Test
 * Tests all Vancouver venue scrapers to verify they produce real events only
 * NO fallback or sample events allowed
 */

const fs = require('fs');
const { filterEvents } = require('../../utils/eventFilter');
const path = require('path');

// Import all Vancouver scrapers
const foxCabaret = require('./foxCabaret.js');
const fortuneSoundClub = require('./fortuneSoundClub.js');
const rickshawTheatre = require('./rickshawTheatre.js');
const vogueTheatre = require('./vogueTheatre.js');
const theCultch = require('./theCultch.js');
const queenElizabethTheatre = require('./queenElizabethTheatre.js');
const thePearl = require('./thePearl.js');
const richmondNightMarket = require('./richmondNightMarket.js');
const shipyardsNightMarket = require('./shipyardsNightMarket.js');
const theRoxy = require('./theRoxy.js');
const vancouverConventionCentre = require('./vancouverConventionCentre.js');
const canadaPlace = require('./canadaPlace.js');

// Also include existing scrapers
let commodoreBallroom = null;
let rogersArena = null;
try {
  commodoreBallroom = require('./commodoreBallroom.js');
} catch (e) {
  console.log('Commodore Ballroom scraper not found');
}

try {
  rogersArena = require('./rogersArena.js');
} catch (e) {
  console.log('Rogers Arena scraper not found');
}

const scrapers = [
  { name: 'Fox Cabaret', scraper: foxCabaret },
  { name: 'Fortune Sound Club', scraper: fortuneSoundClub },
  { name: 'Rickshaw Theatre', scraper: rickshawTheatre },
  { name: 'Vogue Theatre', scraper: vogueTheatre },
  { name: 'The Cultch', scraper: theCultch },
  { name: 'Queen Elizabeth Theatre', scraper: queenElizabethTheatre },
  { name: 'The Pearl', scraper: thePearl },
  { name: 'Richmond Night Market', scraper: richmondNightMarket },
  { name: 'Shipyards Night Market', scraper: shipyardsNightMarket },
  { name: 'The Roxy', scraper: theRoxy },
  { name: 'Vancouver Convention Centre', scraper: vancouverConventionCentre },
  { name: 'Canada Place', scraper: canadaPlace }
];

// Add new scrapers
const bcPlace = require('./bcPlace.js');
const granvilleIsland = require('./granvilleIsland.js');
const vancouverArtGallery = require('./vancouverArtGallery.js');
const scienceWorld = require('./scienceWorld.js');
const pneForums = require('./pneForums.js');
const orpheum = require('./orpheum.js');
const phoenixConcertTheatre = require('./phoenixConcertTheatre.js');
const playhouse = require('./playhouse.js');
const blueShore = require('./blueShore.js');
const vanierPark = require('./vanierPark.js');

scrapers.push(
  { name: 'BC Place', scraper: bcPlace },
  { name: 'Granville Island', scraper: granvilleIsland },
  { name: 'Vancouver Art Gallery', scraper: vancouverArtGallery },
  { name: 'Science World', scraper: scienceWorld },
  { name: 'PNE Forum', scraper: pneForums },
  { name: 'Orpheum Theatre', scraper: orpheum },
  { name: 'Phoenix Concert Theatre', scraper: phoenixConcertTheatre },
  { name: 'Vancouver Playhouse', scraper: playhouse },
  { name: 'BlueShore Financial Centre', scraper: blueShore },
  { name: 'Vanier Park Venues', scraper: vanierPark }
);

// Add existing scrapers if available
if (commodoreBallroom) {
  scrapers.push({ name: 'Commodore Ballroom', scraper: commodoreBallroom });
}
if (rogersArena) {
  scrapers.push({ name: 'Rogers Arena', scraper: rogersArena });
}

async function testAllScrapers() {
  console.log('🚀 Testing all Vancouver venue scrapers...\n');
  
  const results = [];
  let totalEvents = 0;
  
  for (const { name, scraper } of scrapers) {
    console.log(`\n📍 Testing ${name}...`);
    console.log('='.repeat(50));
    
    try {
      const startTime = Date.now();
      const events = await scraper.scrape('Vancouver');
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Validate events
      const validationResults = validateEvents(events, name);
      
      results.push({
        venue: name,
        success: true,
        eventCount: events.length,
        duration: `${duration}ms`,
        validation: validationResults,
        events: events.slice(0, 3) // Show first 3 events as sample
      });
      
      totalEvents += events.length;
      
      console.log(`✅ ${name}: ${events.length} events found in ${duration}ms`);
      if (validationResults.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${validationResults.warnings.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ ${name}: Error - ${error.message}`);
      results.push({
        venue: name,
        success: false,
        error: error.message,
        eventCount: 0,
        duration: 'N/A'
      });
    }
  }
  
  // Generate summary report
  console.log('\n🎯 SCRAPING RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total venues tested: ${scrapers.length}`);
  console.log(`Successful scrapers: ${results.filter(r => r.success).length}`);
  console.log(`Failed scrapers: ${results.filter(r => !r.success).length}`);
  console.log(`Total events found: ${totalEvents}`);
  
  // Show detailed results
  console.log('\n📊 DETAILED RESULTS:');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.venue}: ${result.eventCount} events (${result.duration})`);
      if (result.validation.warnings.length > 0) {
        console.log(`   ⚠️  ${result.validation.warnings.join(', ')}`);
      }
    } else {
      console.log(`❌ ${result.venue}: ${result.error}`);
    }
  });
  
  // Save results to file
  const reportPath = path.join(__dirname, 'scraper-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalVenues: scrapers.length,
      successfulScrapers: results.filter(r => r.success).length,
      failedScrapers: results.filter(r => !r.success).length,
      totalEvents: totalEvents
    },
    results: results
  }, null, 2));
  
  console.log(`\n📝 Full results saved to: ${reportPath}`);
  
  return results;
}

function validateEvents(events, venueName) {
  const warnings = [];
  
  if (!events || !Array.isArray(events)) {
    warnings.push('Events is not an array');
    return { warnings };
  }
  
  if (events.length === 0) {
    warnings.push('No events found');
    return { warnings };
  }
  
  // Check for suspicious patterns that might indicate fake/sample events
  const titles = events.map(e => e.title).filter(Boolean);
  const uniqueTitles = new Set(titles);
  
  if (titles.length > 0 && uniqueTitles.size < titles.length * 0.5) {
    warnings.push('High duplicate title ratio - possible fake events');
  }
  
  // Check for events with recurring patterns
  const recurringCheck = events.filter(e => 
    e.title && (
      e.title.toLowerCase().includes('weekly') ||
      e.title.toLowerCase().includes('every') ||
      e.title.toLowerCase().includes('recurring')
    )
  );
  
  if (recurringCheck.length > 0) {
    warnings.push(`Found ${recurringCheck.length} potentially recurring/fake events`);
  }
  
  // Check for events with generic/placeholder titles
  const genericTitles = events.filter(e => 
    e.title && (
      e.title.toLowerCase().includes('sample') ||
      e.title.toLowerCase().includes('test') ||
      e.title.toLowerCase().includes('placeholder') ||
      e.title.toLowerCase().includes('coming soon')
    )
  );
  
  if (genericTitles.length > 0) {
    warnings.push(`Found ${genericTitles.length} events with generic/placeholder titles`);
  }
  
  return { warnings };
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAllScrapers().catch(console.error);
}

module.exports = { testAllScrapers, validateEvents };
