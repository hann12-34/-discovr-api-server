const { enhanceEvents } = require("../../utils/fetchEventDetails");

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
const scrapeHammerMuseum = require('./scrape-hammer-museum');
const scrapeKiaForum = require('./scrape-kia-forum');
const scrapeSofiStadium = require('./scrape-sofi-stadium');
const scrapeFifa2026 = require('./fifa2026');
const scrapeTheEcho = require('./theEcho');
const scrapeTheFonda = require('./theFonda');
const scrapeHollywoodPalladium = require('./hollywoodPalladium');
const scrapeTeragramBallroom = require('./teragramBallroom');
const scrapeRegentTheater = require('./regentTheater');
const scrapeLodgeRoom = require('./lodgeRoom');
const scrapeMoroccanLounge = require('./moroccanLounge');
const scrapeZebulon = require('./zebulon');
const scrapeEchoPlexLA = require('./echoPlexLA');
const scrapeCreateNightclub = require('./createNightclub');
const scrapeCatchOneLA = require('./catchOneLA');
const scrape1720LA = require('./1720LA');
const scrapeDaisyLA = require('./daisyLA');
const scrapeUnionLA = require('./unionLA');
const scrapeDoLA = require('./doLA');
const scrapeTheAbbey = require('./theAbbey');
const scrapeTheNovo = require('./theNovo');
const scrapeLACMA = require('./lacma');
const scrapeLAConservancy = require('./laConservancy');
const scrapeResidentAdvisorLA = require('./residentAdvisorLA');
const scrapeShrineAuditorium = require('./shrineAuditorium');
const scrapeHouseOfBluesLA = require('./houseOfBluesLA');
const scrapeCryptoArena = require('./cryptoArena');

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
    
    const fifaEvents = await scrapeFifa2026('Los Angeles');
    allEvents.push(...fifaEvents);

    const echoEvents = await scrapeTheEcho();
    allEvents.push(...echoEvents);

    const fondaEvents = await scrapeTheFonda();
    allEvents.push(...fondaEvents);

    const palladiumEvents = await scrapeHollywoodPalladium();
    allEvents.push(...palladiumEvents);

    const teragramEvents = await scrapeTeragramBallroom();
    allEvents.push(...teragramEvents);

    const regentEvents = await scrapeRegentTheater();
    allEvents.push(...regentEvents);

    const lodgeRoomEvents = await scrapeLodgeRoom();
    allEvents.push(...lodgeRoomEvents);

    const moroccanEvents = await scrapeMoroccanLounge();
    allEvents.push(...moroccanEvents);

    const zebulonEvents = await scrapeZebulon();
    allEvents.push(...zebulonEvents);

    const echoPlexEvents = await scrapeEchoPlexLA();
    allEvents.push(...echoPlexEvents);

    const createEvents = await scrapeCreateNightclub();
    allEvents.push(...createEvents);

    const catchOneEvents = await scrapeCatchOneLA();
    allEvents.push(...catchOneEvents);

    const events1720 = await scrape1720LA();
    allEvents.push(...events1720);

    const daisyEvents = await scrapeDaisyLA();
    allEvents.push(...daisyEvents);

    const unionEvents = await scrapeUnionLA();
    allEvents.push(...unionEvents);

    const doEvents = await scrapeDoLA();
    allEvents.push(...doEvents);

    const abbeyEvents = await scrapeTheAbbey();
    allEvents.push(...abbeyEvents);

    const novoEvents = await scrapeTheNovo();
    allEvents.push(...novoEvents);

    const lacmaEvents = await scrapeLACMA();
    allEvents.push(...lacmaEvents);

    const conservancyEvents = await scrapeLAConservancy();
    allEvents.push(...conservancyEvents);

    const raEvents = await scrapeResidentAdvisorLA();
    allEvents.push(...raEvents);

    const shrineEvents = await scrapeShrineAuditorium();
    allEvents.push(...shrineEvents);

    const hobEvents = await scrapeHouseOfBluesLA();
    allEvents.push(...hobEvents);

    const cryptoEvents = await scrapeCryptoArena();
    allEvents.push(...cryptoEvents);

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

const _rawExports = {
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
  scrapeHammerMuseum,
  scrapeKiaForum,
  scrapeSofiStadium,
  scrapeFifa2026,
  scrapeTheEcho,
  scrapeTheFonda,
  scrapeHollywoodPalladium,
  scrapeTeragramBallroom,
  scrapeRegentTheater,
  scrapeLodgeRoom,
  scrapeMoroccanLounge,
  scrapeZebulon,
  scrapeEchoPlexLA,
  scrapeCreateNightclub,
  scrapeCatchOneLA,
  scrape1720LA,
  scrapeDaisyLA,
  scrapeUnionLA,
  scrapeDoLA,
  scrapeTheAbbey,
  scrapeTheNovo,
  scrapeLACMA,
  scrapeLAConservancy,
  scrapeResidentAdvisorLA,
  scrapeShrineAuditorium,
  scrapeHouseOfBluesLA,
  scrapeCryptoArena,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
