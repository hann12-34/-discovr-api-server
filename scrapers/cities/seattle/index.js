/**
 * Seattle Scrapers Index
 * Exports all Seattle venue scrapers
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
const generateSeattleFestivals = require('./seattleFestivals');
const generateSeattleNightlife = require('./seattleNightlife');

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
    
    // Generated events
    const festivalEvents = generateSeattleFestivals();
    allEvents.push(...festivalEvents);
    
    const nightlifeEvents = generateSeattleNightlife();
    allEvents.push(...nightlifeEvents);
    
  } catch (error) {
    console.error('Error in Seattle scrapers:', error.message);
  }
  
  console.log('='.repeat(50));
  console.log(`☕ Total Seattle events: ${allEvents.length}`);
  
  return allEvents;
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
  generateSeattleFestivals,
  generateSeattleNightlife
};
