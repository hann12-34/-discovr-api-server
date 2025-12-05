/**
 * Los Angeles Scrapers Index
 * Exports all LA venue scrapers and event generators
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
const generateLANightlife = require('./laNightlife');
const generateLAFestivals = require('./laFestivals');
const generateLABeachClubs = require('./laBeachClubs');
const generateLARooftopBars = require('./laRooftopBars');
const generateLAConcertVenues = require('./laConcertVenues');

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
    
    // Generated Events - Recurring weekly
    const nightlifeEvents = generateLANightlife();
    allEvents.push(...nightlifeEvents);
    
    const festivalEvents = generateLAFestivals();
    allEvents.push(...festivalEvents);
    
    const beachEvents = generateLABeachClubs();
    allEvents.push(...beachEvents);
    
    const rooftopEvents = generateLARooftopBars();
    allEvents.push(...rooftopEvents);
    
    const concertEvents = generateLAConcertVenues();
    allEvents.push(...concertEvents);
    
  } catch (error) {
    console.error('Error in LA scrapers:', error.message);
  }
  
  console.log('='.repeat(50));
  console.log(`🎬 Total Los Angeles events: ${allEvents.length}`);
  
  return allEvents;
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
  scrapeElReyTheatre,
  generateLANightlife,
  generateLAFestivals,
  generateLABeachClubs,
  generateLARooftopBars,
  generateLAConcertVenues
};
