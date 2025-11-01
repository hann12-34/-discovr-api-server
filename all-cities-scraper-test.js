const fs = require('fs');
const path = require('path');

// City configurations with key scrapers to test
const cityConfigs = {
  Vancouver: {
    directory: 'vancouver',
    keyScrapers: [
      'commodoreBallroom.js',
      'foxCabaret.js', 
      'granvilleIsland.js',
      'phoenixConcertTheatre.js',
      'bcPlace.js',
      'artsClubTheatre.js',
      'chanCentre.js',
      'ubcChanCentre.js'
    ]
  },
  Toronto: {
    directory: 'Toronto',
    keyScrapers: [
      'horseshoeTavern.js',
      'scotiabank.js',
      'phoenixConcertTheatre.js',
      'scrape-casa-loma-working.js',
      'scrape-cn-tower-working.js',
      'scrape-danforth-music-hall-working.js',
      'scrape-rebel-nightclub-working.js',
      'scrape-roy-thomson-hall-working.js'
    ]
  },
  Calgary: {
    directory: 'Calgary',
    keyScrapers: [
      'saddledome.js',
      'macEwanHall.js',
      'scrape-calgary-zoo.js',
      'scrape-heritage-park.js',
      'scrape-theatre-calgary.js',
      'scrape-jubilee-auditorium.js'
    ]
  },
  Montreal: {
    directory: 'Montreal',
    keyScrapers: [
      'bellCentre.js',
      'theatreSaintDenis.js',
      'placeDesArts.js',
      'olympiaDeMontrealEvents.js',
      'maisonneuvePark.js'
    ]
  },
  NewYork: {
    directory: 'NewYork',
    keyScrapers: [
      'madisonSquareGarden.js',
      'lincolnCenter.js',
      'apolloTheater.js',
      'broadwayShows.js',
      'centralPark.js'
    ]
  }
};

async function testScraper(scraperPath, city) {
  try {
    if (!fs.existsSync(scraperPath)) {
      return { events: 0, status: 'FILE NOT FOUND' };
    }

    const scraper = require(scraperPath);
    let events;

    if (typeof scraper.scrape === 'function') {
      events = await scraper.scrape(city);
      return { events: events.length, status: 'WORKING (object export)' };
    } else if (typeof scraper === 'function') {
      events = await scraper(city);
      return { events: events.length, status: 'WORKING (function export)' };
    } else if (scraper.scrapeEvents && typeof scraper.scrapeEvents === 'function') {
      events = await scraper.scrapeEvents();
      return { events: events.length, status: 'WORKING (class method)' };
    } else {
      return { events: 0, status: 'EXPORT ERROR' };
    }
  } catch (error) {
    return { 
      events: 0, 
      status: `ERROR: ${error.message.substring(0, 30)}` 
    };
  }
}

async function testCityScrapers(cityName, config) {
  console.log(`\n🏙️  TESTING ${cityName.toUpperCase()} SCRAPERS`);
  console.log('='.repeat(50));
  
  let totalEvents = 0;
  const results = [];
  const workingScrapers = [];
  
  for (const scraperFile of config.keyScrapers) {
    const scraperPath = path.join(__dirname, 'scrapers', 'cities', config.directory, scraperFile);
    
    console.log(`🔍 Testing ${scraperFile}...`);
    const result = await testScraper(scraperPath, cityName);
    
    const venue = scraperFile.replace('.js', '').replace('scrape-', '').replace('-working', '');
    console.log(`${result.status.includes('WORKING') ? '✅' : '❌'} ${venue}: ${result.events} events`);
    
    totalEvents += result.events;
    results.push({
      file: scraperFile,
      venue,
      events: result.events,
      status: result.status
    });
    
    if (result.status.includes('WORKING') && result.events > 0) {
      workingScrapers.push({ venue, events: result.events });
    }
  }
  
  return {
    cityName,
    totalEvents,
    results,
    workingScrapers,
    workingCount: results.filter(r => r.status.includes('WORKING')).length,
    totalScrapers: results.length
  };
}

async function testAllCities() {
  console.log('🎯 COMPREHENSIVE SCRAPER TEST - ALL CITIES');
  console.log('==========================================');
  console.log('Testing key scrapers for each city...\n');
  
  const cityResults = [];
  let grandTotalEvents = 0;
  
  for (const [cityName, config] of Object.entries(cityConfigs)) {
    const cityResult = await testCityScrapers(cityName, config);
    cityResults.push(cityResult);
    grandTotalEvents += cityResult.totalEvents;
  }
  
  // Summary Report
  console.log('\n📊 COMPREHENSIVE SUMMARY');
  console.log('========================');
  
  cityResults.forEach(city => {
    const successRate = Math.round((city.workingCount / city.totalScrapers) * 100);
    console.log(`${city.cityName.padEnd(12)} | ${city.totalEvents.toString().padStart(4)} events | ${city.workingCount}/${city.totalScrapers} working (${successRate}%)`);
  });
  
  console.log('========================');
  console.log(`GRAND TOTAL: ${grandTotalEvents} events`);
  console.log(`Cities Tested: ${cityResults.length}`);
  
  // Top performers
  console.log('\n🏆 TOP PERFORMING CITIES:');
  cityResults
    .sort((a, b) => b.totalEvents - a.totalEvents)
    .forEach((city, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${city.cityName.padEnd(12)} | ${city.totalEvents} events`);
    });
  
  // Detailed breakdown
  console.log('\n📋 DETAILED BREAKDOWN BY CITY:');
  cityResults.forEach(city => {
    console.log(`\n${city.cityName.toUpperCase()}:`);
    city.workingScrapers
      .sort((a, b) => b.events - a.events)
      .slice(0, 5)
      .forEach((venue, i) => {
        console.log(`  ${(i + 1)}. ${venue.venue.padEnd(25)} | ${venue.events} events`);
      });
  });
  
  // Issues summary
  console.log('\n⚠️  ISSUES FOUND:');
  cityResults.forEach(city => {
    const brokenScrapers = city.results.filter(r => !r.status.includes('WORKING'));
    if (brokenScrapers.length > 0) {
      console.log(`\n${city.cityName}:`);
      brokenScrapers.forEach(scraper => {
        console.log(`  ❌ ${scraper.venue}: ${scraper.status}`);
      });
    }
  });
  
  return cityResults;
}

testAllCities().catch(console.error);
