// NEW YORK MASTER ORCHESTRATOR - Modern Toronto-style architecture
// This orchestrator auto-discovers and runs ALL New York scrapers using proven patterns

const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Helper functions and constants
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|membership)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens)$/i,
    /^(en|fr|\d+|\.\.\.|\s*-\s*|more|info|details|click|here|read|view|see|all)$/i,
    /share to|opens in a new window|click here|read more|view all|see all/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

// DYNAMIC LOADING - Import ALL New York scrapers automatically
function loadAllNewYorkScrapers() {
  const scrapers = {};
  const scrapersDir = __dirname;
  
  // Priority list of working NYC scrapers (including new clean versions)
  const priorityScrapers = [
    'scrape-nyc-general-events-clean.js',
    'scrape-brooklyn-events-clean.js',
    'scrape-manhattan-events-clean.js',
    'scrape-queens-events-clean.js',
    'scrape-madison-square-garden-events-clean.js',
    'scrape-lincoln-center-events-clean.js',
    'apollo-theater-fixed.js',
    'beacon-theatre-fixed.js',
    'broadway-theaters-fixed.js',
    'central-park-fixed.js',
    'irving-plaza-fixed.js',
    'lincoln-center-fixed.js',
    'mercury-lounge-fixed.js',
    'radio-city-music-hall-fixed.js',
    'village-vanguard-fixed.js'
  ];
  
  // Get all .js files in New York directory
  const allFiles = fs.readdirSync(scrapersDir).filter(file => 
    file.endsWith('.js') && 
    !file.includes('scrape-all-') && // Skip orchestrator files
    !file.includes('test-') && // Skip test scripts
    !file.includes('repair') && // Skip repair scripts
    !file.includes('index') // Skip index files
  );
  
  console.log(`🔍 Found ${allFiles.length} New York scraper files`);
  
  // Filter to only priority scrapers that exist
  const existingPriorityFiles = priorityScrapers.filter(file => 
    fs.existsSync(path.join(scrapersDir, file))
  );
  
  console.log(`🎯 Loading ${existingPriorityFiles.length} priority NYC scrapers...`);
  
  // Load each priority scraper dynamically
  existingPriorityFiles.forEach(file => {
    const scraperName = file.replace('.js', '').replace('scrape-', '').replace(/-events?/, '').replace(/-clean$/, '').replace(/-fixed$/, '');
    try {
      const scraper = require(`./${file}`);
      
      // Handle different export patterns
      if (scraper && typeof scraper.scrapeEvents === 'function') {
        // Toronto-style function export (preferred)
        scrapers[scraperName] = scraper;
        console.log(`✅ Loaded modern scraper: ${scraperName}`);
      } else if (scraper && typeof scraper.scrape === 'function') {
        // Class-based export - create adapter
        scrapers[scraperName] = {
          scrapeEvents: async (city) => {
            try {
              const instance = new scraper();
              const result = await instance.scrape();
              return { events: result || [], venue: instance.venueName || scraperName, city: city || 'New York', count: (result || []).length };
            } catch (error) {
              console.error(`❌ Class adapter error for ${scraperName}:`, error.message);
              return { events: [], venue: scraperName, city: city || 'New York', count: 0, error: error.message };
            }
          }
        };
        console.log(`✅ Loaded adapted scraper: ${scraperName}`);
      } else if (typeof scraper === 'function') {
        // Function export
        scrapers[scraperName] = {
          scrapeEvents: async (city) => {
            try {
              const result = await scraper();
              return { events: result || [], venue: scraperName, city: city || 'New York', count: (result || []).length };
            } catch (error) {
              console.error(`❌ Function adapter error for ${scraperName}:`, error.message);
              return { events: [], venue: scraperName, city: city || 'New York', count: 0, error: error.message };
            }
          }
        };
        console.log(`✅ Loaded function scraper: ${scraperName}`);
      } else {
        console.log(`⚠️ Unknown export pattern for ${file}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load ${file}:`, error.message);
    }
  });
  
  return scrapers;
}

const scrapers = loadAllNewYorkScrapers();

// DYNAMIC LIST - Generate scrapers list from all loaded scrapers
const scrapersToRun = Object.keys(scrapers).map(key => {
  return {
    name: key,
    scraper: scrapers[key]
  };
});

console.log(`🎯 New York Orchestrator loaded ${scrapersToRun.length} scrapers for execution`);

// Event validation with NYC-specific characteristics
const hasEventCharacteristics = (title, description, dateText, eventUrl) => {
  if (!title) return false;
  
  // Positive indicators for real NYC events
  const eventIndicators = [
    /broadway|concert|show|exhibition|performance|workshop|tour|festival|gala|premiere/i,
    /tickets|admission|rsvp|register|book now|buy now/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b\d{1,2}:\d{2}\b/i, // Time patterns
    /\b(am|pm)\b/i,
    /manhattan|brooklyn|queens|bronx|staten island/i,
    /nyc|new york city/i
  ];
  
  const combinedText = `${title} ${description || ''} ${dateText || ''}`.toLowerCase();
  return eventIndicators.some(pattern => pattern.test(combinedText));
};

// NYC venue information helper
const getNYCVenueInfo = (venueName, city = 'New York') => ({
  name: venueName,
  id: venueName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
  city: city,
  province: 'NY',
  country: 'USA',
  location: {
    address: `${venueName}, New York, NY`,
    coordinates: [-73.9857, 40.7484] // NYC center coordinates
  },
  category: 'Entertainment',
  website: null
});

// MAIN ORCHESTRATOR FUNCTION
async function scrapeAllNewYorkCleanEvents(city = 'New York') {
  console.log(`🗽 Starting New York Master Orchestrator - Running ${scrapersToRun.length} scrapers...`);
  
  let totalEvents = 0;
  let successfulScrapers = 0;
  let failedScrapers = 0;
  const results = [];
  
  for (const { name, scraper } of scrapersToRun) {
    try {
      console.log(`\n🎭 Running NYC scraper: ${name}...`);
      const result = await scraper.scrapeEvents(city);
      
      if (result && result.events && result.events.length > 0) {
        // Validate events for NYC characteristics
        const validEvents = result.events.filter(event => 
          event.title && isValidEvent(event.title)
        );
        
        if (validEvents.length > 0) {
          totalEvents += validEvents.length;
          successfulScrapers++;
          console.log(`✅ ${name}: ${validEvents.length} valid NYC events`);
          results.push({ name, count: validEvents.length, events: validEvents });
        } else {
          console.log(`⚠️ ${name}: 0 valid events after filtering`);
        }
      } else {
        console.log(`⚠️ ${name}: No events returned`);
      }
      
      // Add delay between scrapers to avoid rate limiting
      await delay(1000 + Math.random() * 2000);
      
    } catch (error) {
      failedScrapers++;
      console.error(`❌ ${name} failed:`, error.message);
    }
  }
  
  console.log(`\n📊 New York Orchestrator Results:`);
  console.log(`   Total Events: ${totalEvents}`);
  console.log(`   Successful Scrapers: ${successfulScrapers}/${scrapersToRun.length}`);
  console.log(`   Failed Scrapers: ${failedScrapers}`);
  console.log(`   Success Rate: ${((successfulScrapers / scrapersToRun.length) * 100).toFixed(1)}%`);
  
  // Display top performers
  const topPerformers = results
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  console.log(`\n🏆 Top NYC Event Sources:`);
  topPerformers.forEach((performer, index) => {
    console.log(`   ${index + 1}. ${performer.name}: ${performer.count} events`);
  });
  
  return {
    totalEvents,
    successfulScrapers,
    failedScrapers,
    city,
    scrapers: scrapersToRun.length,
    results
  };
}

// Clean production export
module.exports = { scrape: scrapeAllNewYorkCleanEvents };

// Test execution when run directly
if (require.main === module) {
  scrapeAllNewYorkCleanEvents('New York').then(result => {
    console.log(`\n🗽 NYC Orchestrator Complete!`);
    console.log(`   City: ${result.city}`);
    console.log(`   Total Events: ${result.totalEvents}`);
    console.log(`   Working Scrapers: ${result.successfulScrapers}/${result.scrapers}`);
  });
}
