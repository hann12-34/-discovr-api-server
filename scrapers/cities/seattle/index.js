/**
 * Seattle Scrapers Index
 * REAL venue scrapers only - NO GENERATORS OR FALLBACKS
 */

const neumos = require('./neumos');
const showbox = require('./showbox');
const kremwerk = require('./kremwerk');
const chopSuey = require('./chopSuey');
const nectarLounge = require('./nectarLounge');
const tractorTavern = require('./tractorTavern');
const stgPresents = require('./stgPresents');
const conorByrnePub = require('./conorByrnePub');
const oraNightclub = require('./oraNightclub');
const trinityNightclub = require('./trinityNightclub');
const elCorazon = require('./elCorazon');
const massiveClub = require('./massiveClub');
const sunsetTavern = require('./sunsetTavern');
const skylarkCafe = require('./skylarkCafe');
const fremontAbbey = require('./fremontAbbey');
const substation = require('./substation');

async function scrapeSeattle() {
  console.log('☕ Starting Seattle scrapers...');
  console.log('='.repeat(50));
  
  const allEvents = [];
  
  try {
    // Puppeteer scrapers
    const neumosEvents = await neumos();
    allEvents.push(...neumosEvents);
    
    const showboxEvents = await showbox();
    allEvents.push(...showboxEvents);
    
    const kremwerkEvents = await kremwerk();
    allEvents.push(...kremwerkEvents);
    
    const chopSueyEvents = await chopSuey();
    allEvents.push(...chopSueyEvents);
    
    const nectarEvents = await nectarLounge();
    allEvents.push(...nectarEvents);
    
    const tractorEvents = await tractorTavern();
    allEvents.push(...tractorEvents);
    
    const stgEvents = await stgPresents();
    allEvents.push(...stgEvents);
    
    const conorEvents = await conorByrnePub();
    allEvents.push(...conorEvents);
    
    const oraEvents = await oraNightclub();
    allEvents.push(...oraEvents);
    
    const trinityEvents = await trinityNightclub();
    allEvents.push(...trinityEvents);
    
    const elCorazonEvents = await elCorazon();
    allEvents.push(...elCorazonEvents);
    
    const massiveEvents = await massiveClub();
    allEvents.push(...massiveEvents);
    
    const sunsetEvents = await sunsetTavern();
    allEvents.push(...sunsetEvents);
    
    const skylarkEvents = await skylarkCafe();
    allEvents.push(...skylarkEvents);
    
    const fremontEvents = await fremontAbbey();
    allEvents.push(...fremontEvents);
    
    const substationEvents = await substation();
    allEvents.push(...substationEvents);
    
    // NO GENERATORS - only real venue scrapers
    
  } catch (error) {
    console.error('Error in Seattle scrapers:', error.message);
  }
  
  console.log('='.repeat(50));
  console.log(`☕ Total Seattle events: ${allEvents.length}`);
  
  // Filter out bad venues/titles/addresses
  const badVenuePatterns = [/^TBA$/i, /^various/i, /^unknown/i, /^seattle$/i];
  const badTitlePatterns = [/^funded by/i, /^government of/i, /^sponsored by/i, /^advertisement/i];
  const badAddressPatterns = [/^TBA$/i, /^various/i, /^seattle,?\s*wa$/i];
  
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
  scrapeSeattle,
  neumos,
  showbox,
  kremwerk,
  chopSuey,
  nectarLounge,
  tractorTavern,
  stgPresents,
  conorByrnePub,
  oraNightclub,
  trinityNightclub,
  elCorazon,
  massiveClub,
  sunsetTavern,
  skylarkCafe,
  fremontAbbey,
  substation
};
