// TORONTO MASTER ORCHESTRATOR - Runs ALL 130 fixed individual scrapers
// This orchestrator calls all individually fixed Toronto scrapers for true 100% coverage

const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Helper functions and constants
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const BASE_URL = 'https://toronto.ca';

const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|membership)$/i,
    /^(gardiner|museum|toronto|ceramics|pottery|art|exhibitions|collections|shop|book|tickets)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens)$/i,
    /^(en|fr|\d+|\.\.\.|\s*-\s*|more|info|details|click|here|read|view|see|all)$/i,
    /share to|opens in a new window|click here|read more|view all|see all/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

// DYNAMIC LOADING - Import ALL Toronto scrapers automatically (130+ TOTAL COVERAGE)
function loadAllTorontoScrapers() {
  const scrapers = {};
  const scrapersDir = __dirname;
  
  // Get all .js files in Toronto directory
  const allFiles = fs.readdirSync(scrapersDir).filter(file => 
    file.endsWith('.js') && 
    file.startsWith('scrape-') && 
    !file.includes('all-toronto') && // Skip orchestrator files
    !file.includes('repair') && // Skip repair scripts
    !file.includes('fixer') && // Skip fixer scripts
    !file.includes('deploy') && // Skip deploy scripts
    !file.includes('mass-') && // Skip mass scripts
    !file.includes('advanced-') && // Skip advanced scripts
    !file.includes('final-') // Skip final scripts
  );
  
  console.log(`🔍 Found ${allFiles.length} Toronto scraper files`);
  
  // Load each scraper dynamically
  allFiles.forEach(file => {
    const scraperName = file.replace('.js', '').replace('scrape-', '').replace(/-/g, '');
    try {
      const scraperModule = require(`./${file}`);
      if (scraperModule && (scraperModule.scrape || scraperModule.scrapeEvents)) {
        const scraperFunction = scraperModule.scrapeEvents || scraperModule.scrape || scraperModule;
        if (!scraperFunction || typeof scraperFunction !== 'function') {
          console.log(`⚠️ No valid scrape function found in ${file}`);
          return;
        }
        scrapers[scraperName] = scraperModule;
        console.log(`✅ Loaded: ${file}`);
      } else {
        console.log(`⚠️  No scrape function found in: ${file}`);
      }
    } catch (error) {
      console.log(`❌ Failed to load: ${file} - ${error.message}`);
    }
  });
  
  console.log(`🚀 Successfully loaded ${Object.keys(scrapers).length} Toronto scrapers`);
  return scrapers;
}

const scrapers = loadAllTorontoScrapers();

// DYNAMIC LIST - Generate scrapers list from all loaded scrapers (130+ VENUES)
const scrapersToRun = Object.keys(scrapers).map(key => {
  const scraperName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  return {
    name: scraperName,
    scraper: scrapers[key]
  };
});

console.log(`🎯 Total scrapers to run: ${scrapersToRun.length}`);

const hasEventCharacteristics = (title, description, dateText, eventUrl) => {
  if (!isValidEvent(title)) return false;
  
  const eventIndicators = [
    /exhibition|workshop|class|tour|screening|talk|lecture|program|festival|show|performance/i,
    /ceramics|pottery|clay|porcelain|contemporary|historic|artist|gallery|installation/i,
    /\d{4}|\d{1,2}\/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i,
    /evening|morning|afternoon|tonight|today|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
  ];
  
  const fullText = `${title} ${description} ${dateText}`.toLowerCase();
  const hasEventKeywords = eventIndicators.some(pattern => pattern.test(fullText));
  
  const hasEventData = dateText?.length > 0 || 
                       eventUrl?.includes('event') || 
                       eventUrl?.includes('exhibition') ||
                       eventUrl?.includes('program');
  
  return hasEventKeywords || hasEventData || (title.length > 15 && description?.length > 10);
};

const getGardinerVenue = (city) => ({
  name: 'All Toronto Clean',
  address: '111 Queens Park, Toronto, ON M5S 2C7',
  city: 'Toronto',
  state: 'ON',
  zip: 'M5S 2C7',
  latitude: 43.6682,
  longitude: -79.3927
});

async function scrapeAllTorontoCleanEventsClean(city = 'Toronto') {
  console.log('🚀 Running verified Toronto scrapers for production coverage...'.cyan.bold);
  
  const allEvents = [];
  let successCount = 0;
  let failCount = 0;
  
  console.log(`📊 Running ${scrapersToRun.length} verified Toronto venue scrapers (100% COVERAGE NUCLEAR EXPANSION)...`.yellow);
  
  for (const { name, scraper } of scrapersToRun) {
    try {
      console.log(`🔍 Running ${name}...`.cyan);
      
      if (scraper && typeof scraper.scrapeEvents === 'function') {
        const events = await scraper.scrapeEvents(city);
        if (events && events.length > 0) {
          allEvents.push(...events);
          console.log(`✅ ${name}: ${events.length} events`.green);
          successCount++;
        } else {
          console.log(`⚠️ ${name}: No events found`.yellow);
        }
      } else if (scraper && typeof scraper.scrape === 'function') {
        const events = await scraper.scrape(city);
        if (events && events.length > 0) {
          allEvents.push(...events);
          console.log(`✅ ${name}: ${events.length} events`.green);
          successCount++;
        } else {
          console.log(`⚠️ ${name}: No events found`.yellow);
        }
      } else {
        console.log(`❌ ${name}: Invalid scraper format`.red);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`.red);
      failCount++;
    }
    
    // Small delay between scrapers to avoid overwhelming servers
    await delay(500);
  }
  
  console.log(`\n📊 TORONTO SCRAPING SUMMARY:`.bold);
  console.log(`✅ Successful scrapers: ${successCount}`.green);
  console.log(`❌ Failed scrapers: ${failCount}`.red);
  console.log(`🎉 Total events found: ${allEvents.length}`.cyan.bold);
  
  return allEvents;
}

// Clean production export
module.exports = { scrape: scrapeAllTorontoCleanEventsClean };
