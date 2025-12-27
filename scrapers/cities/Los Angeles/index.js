/**
 * Los Angeles Scrapers Index
 * REAL venue scrapers only - NO GENERATORS OR FALLBACKS
 */

const scrapeAcademyLA = require('./academyLA');
const scrapeExchangeLA = require('./exchangeLA');
const scrapeAvalonHollywood = require('./avalonHollywood');
const scrapeSoundNightclub = require('./soundNightclub');
const scrapeHollywoodBowl = require('./hollywoodBowl');
const scrapeGreekTheatre = require('./greekTheatre');
const scrapeTheWiltern = require('./theWiltern');
const scrapeTheRoxy = require('./theRoxy');
const scrapeTroubadour = require('./troubadour');
const scrapeElReyTheatre = require('./elReyTheatre');

async function scrapeLosAngeles() {
  console.log('🎬 Starting Los Angeles scrapers...');
  console.log('='.repeat(50));
  
  const allEvents = [];
  
  try {
    // Nightlife Venues - Puppeteer scrapers
    const academyEvents = await scrapeAcademyLA();
    allEvents.push(...academyEvents);
    
    const exchangeEvents = await scrapeExchangeLA();
    allEvents.push(...exchangeEvents);
    
    const avalonEvents = await scrapeAvalonHollywood();
    allEvents.push(...avalonEvents);
    
    const soundEvents = await scrapeSoundNightclub();
    allEvents.push(...soundEvents);
    
    const roxyEvents = await scrapeTheRoxy();
    allEvents.push(...roxyEvents);
    
    const troubadourEvents = await scrapeTroubadour();
    allEvents.push(...troubadourEvents);
    
    const elReyEvents = await scrapeElReyTheatre();
    allEvents.push(...elReyEvents);
    
    // Concert Venues - Puppeteer scrapers
    const hollywoodBowlEvents = await scrapeHollywoodBowl();
    allEvents.push(...hollywoodBowlEvents);
    
    const greekEvents = await scrapeGreekTheatre();
    allEvents.push(...greekEvents);
    
    const wilternEvents = await scrapeTheWiltern();
    allEvents.push(...wilternEvents);
    
    // NO GENERATORS - only real venue scrapers
    
  } catch (error) {
    console.error('Error in LA scrapers:', error.message);
  }
  
  console.log('='.repeat(50));
  console.log(`🎬 Total Los Angeles events: ${allEvents.length}`);
  
  // Filter out bad venues/titles/addresses
  const badVenuePatterns = [/^TBA$/i, /^various/i, /^unknown/i, /^los angeles$/i];
  const badTitlePatterns = [/^funded by/i, /^government of/i, /^sponsored by/i, /^advertisement/i];
  const badAddressPatterns = [/^TBA$/i, /^various/i, /^los angeles,?\s*ca$/i];
  
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

module.exports = {
  scrapeLosAngeles,
  scrapeAcademyLA,
  scrapeExchangeLA,
  scrapeAvalonHollywood,
  scrapeSoundNightclub,
  scrapeHollywoodBowl,
  scrapeGreekTheatre,
  scrapeTheWiltern,
  scrapeTheRoxy,
  scrapeTroubadour,
  scrapeElReyTheatre
  // NO GENERATORS - removed all fallback functions
};
