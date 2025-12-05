/**
 * Miami Scrapers Index
 * Nightlife venues in Miami, FL
 */

const clubSpace = require('./clubSpace');
const e11even = require('./e11even');
const livMiami = require('./livMiami');
const m2Miami = require('./m2Miami');
const fillmoreMiami = require('./fillmoreMiami');
const kaseyaCenter = require('./kaseyaCenter');
const vipNightlife = require('./vipNightlife');
const miamiBoatParty = require('./miamiBoatParty');
const wynwoodNightlife = require('./wynwoodNightlife');
const palaceSouthBeach = require('./palaceSouthBeach');
const clevelander = require('./clevelander');
const generateMiamiFestivals = require('./miamiFestivals');
const generateMiamiRooftops = require('./miamiRooftops');

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
    
    const vipEvents = await vipNightlife();
    allEvents.push(...vipEvents);
    
    const palaceEvents = await palaceSouthBeach();
    allEvents.push(...palaceEvents);
    
    // Generated events
    const boatEvents = miamiBoatParty();
    allEvents.push(...boatEvents);
    
    const wynwoodEvents = wynwoodNightlife();
    allEvents.push(...wynwoodEvents);
    
    const clevelanderEvents = clevelander();
    allEvents.push(...clevelanderEvents);
    
    const festivalEvents = generateMiamiFestivals();
    allEvents.push(...festivalEvents);
    
    const rooftopEvents = generateMiamiRooftops();
    allEvents.push(...rooftopEvents);
    
  } catch (error) {
    console.error('Error in Miami scrapers:', error.message);
  }
  
  console.log('='.repeat(50));
  console.log(`🌴 Total Miami events: ${allEvents.length}`);
  
  return allEvents;
}

module.exports = {
  scrapeMiami,
  clubSpace,
  e11even,
  livMiami,
  m2Miami,
  fillmoreMiami,
  kaseyaCenter,
  vipNightlife,
  miamiBoatParty,
  wynwoodNightlife,
  palaceSouthBeach,
  clevelander,
  generateMiamiFestivals,
  generateMiamiRooftops
};
