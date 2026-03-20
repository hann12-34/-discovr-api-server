const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * Miami Scrapers Index
 * REAL venue scrapers only - NO GENERATORS OR FALLBACKS
 */

const clubSpace = require('./clubSpace');
const e11even = require('./e11even');
const livMiami = require('./livMiami');
const m2Miami = require('./m2Miami');
const fillmoreMiami = require('./fillmoreMiami');
const kaseyaCenter = require('./kaseyaCenter');
const palaceSouthBeach = require('./palaceSouthBeach');
const scrapeMiamiAndBeachesEvents = require('./scrape-miami-and-beaches-events');
const scrapeSpaceMiami = require('./scrape-space-miami');

async function scrapeMiami() {
  console.log('🌴 Starting Miami scrapers...');
  console.log('='.repeat(50));
  
  const allEvents = [];
  
  try {
    // Puppeteer scrapers
    const clubSpaceEvents = await clubSpace();
    allEvents.push(...clubSpaceEvents);
    
    const e11evenEvents = await e11even();
    allEvents.push(...e11evenEvents);
    
    const livEvents = await livMiami();
    allEvents.push(...livEvents);
    
    const m2Events = await m2Miami();
    allEvents.push(...m2Events);
    
    const fillmoreEvents = await fillmoreMiami();
    allEvents.push(...fillmoreEvents);
    
    const kaseyaEvents = await kaseyaCenter();
    allEvents.push(...kaseyaEvents);
    
    const palaceEvents = await palaceSouthBeach();
    allEvents.push(...palaceEvents);
    
    // NO GENERATORS - only real venue scrapers
    
  } catch (error) {
    console.error('Error in Miami scrapers:', error.message);
  }
  
  console.log('='.repeat(50));
  console.log(`🌴 Total Miami events: ${allEvents.length}`);
  
  // Filter out bad venues/titles/addresses
  const badVenuePatterns = [/^TBA$/i, /^various/i, /^unknown/i, /^miami$/i];
  const badTitlePatterns = [/^funded by/i, /^government of/i, /^sponsored by/i, /^advertisement/i];
  const badAddressPatterns = [/^TBA$/i, /^various/i, /^miami,?\s*fl$/i];
  
  const validEvents = allEvents.filter(event => {
    const venueName = event.venue?.name || '';
    const venueAddress = event.venue?.address || '';
    const title = event.title || '';
    
    if (badTitlePatterns.some(p => p.test(title))) return false;
    if (badVenuePatterns.some(p => p.test(venueName))) return false;
    if (badAddressPatterns.some(p => p.test(venueAddress))) return false;
    if (!event.date) return false;
    
    return true;
  });
  
  console.log(`✅ ${validEvents.length} valid events (filtered ${allEvents.length - validEvents.length})`);
  return validEvents;
}

const _rawExports = {
  scrapeMiami,
  clubSpace,
  e11even,
  livMiami,
  m2Miami,
  fillmoreMiami,
  kaseyaCenter,
  palaceSouthBeach,
  scrapeMiamiAndBeachesEvents,
  scrapeSpaceMiami,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
