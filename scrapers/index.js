/**
 * Scraper system for Discovr API
 * Orchestrates the scraping of various event sources and venues
 */

// Vancouver venue scrapers
const commodoreBallroom = require('./venues/commodoreBallroomShows');
const foxCabaret = require('./venues/foxCabaret');
const vogueTheatre = require('./venues/vogueTheatre');
const fortuneSoundClub = require('./venues/fortuneSoundClub');
const orpheumTheatre = require('./venues/orpheumTheatre');
const rickshawTheatre = require('./venues/rickshawTheatre');
const rogersArena = require('./venues/rogersArena');
const queenElizabethTheatre = require('./venues/queenElizabethTheatre');
const livingRoom = require('./venues/livingRoom');
const pearlVancouver = require('./venues/pearlVancouver');
const penthouseNightclub = require('./venues/penthouseNightclub');
const theCultch = require('./venues/theCultch');
const auraVancouver = require('./venues/auraVancouver');
const twelveWest = require('./venues/twelveWest');
const celebritiesNightclub = require('./venues/celebritiesNightclub');
const barNone = require('./venues/barNone');
const mansionClub = require('./venues/mansionClub');

// New venue scrapers
const hollywoodTheatre = require('./venues/hollywoodTheatre');
const imperialVancouver = require('./venues/imperialVancouver');
const chanCentre = require('./venues/chanCentre');
const vancouverSymphony = require('./venues/vancouverSymphony');
const cecilGreenArtsHouse = require('./venues/cecilGreenArtsHouse');
const centreForEatingDisorders = require('./venues/centreForEatingDisorders');
const biltmoreCabaret = require('./venues/biltmoreCabaret');
const jazzyVancouver = require('./venues/jazzyVancouver');
const stPaulsAnglican = require('./venues/stPaulsAnglican');
const roxyVancouver = require('./venues/roxyVancouver');

// Event-specific scrapers
const vancouverMuseumEvents = require('./events/vancouverMuseumEvents');
const artGalleryScraper = require('./events/artGalleryScraper');
const beerFestivalScraper = require('./events/beerFestivalScraper');
const comedyEventsScraper = require('./events/comedyEventsScraper');
const playlandPNE = require('./events/playlandPNE');
const richmondNightMarket = require('./events/richmondNightMarket');
const rogersArenaEvents = require('./events/rogersArenaEvents');
const shipyardsNightMarket = require('./events/shipyardsNightMarket');
const specialMarketEvents = require('./events/specialMarketEvents');
const thunderbirdArena = require('./events/thunderbirdArena');
const ticketmasterEventScraper = require('./events/ticketmasterEventScraper');
const vancouverCivicTheatres = require('./events/vancouverCivicTheatres');
const vancouverCulturalEvents = require('./events/vancouverCulturalEvents');
const vancouverFringeFestival = require('./events/vancouverFringeFestival');
const vancouverOutdoorEvents = require('./events/vancouverOutdoorEvents');
const vancouverSportsEvents = require('./events/vancouverSportsEvents');

// New event scrapers
const vancouverComedyFest = require('./events/vancouverComedyFest');
const bcEventCalendar = require('./events/bcEventCalendar');
const coastalJazzFestival = require('./events/coastalJazzFestival');
// Destination Vancouver Events scraper removed due to complexity with dynamic content
const vanDusenEvents = require('./events/vanDusenEvents');
const vancouverChristmasMarket = require('./events/vancouverChristmasMarket');
const vancouverFarmersMarkets = require('./events/vancouverFarmersMarkets');
const capilanoBridge = require('./events/capilanoBridge');
const grouseMountainEvents = require('./events/grouseMountainEvents');
const dragonBoatBC = require('./events/dragonBoatBC');
const beerFestivalEvents = require('./events/beerFestivalEvents');
const iHeartRaves = require('./events/iHeartRaves');
const Event = require('../models/Event');

// List of all available scrapers
const scrapers = [
  // Original venue scrapers
  commodoreBallroom,
  foxCabaret,
  vogueTheatre,
  fortuneSoundClub,
  orpheumTheatre,
  rickshawTheatre,
  rogersArena,
  queenElizabethTheatre,
  livingRoom,
  pearlVancouver,
  penthouseNightclub,
  theCultch,
  auraVancouver,
  twelveWest,
  celebritiesNightclub,
  barNone,
  mansionClub,
  
  // New venue scrapers
  hollywoodTheatre,
  imperialVancouver,
  chanCentre,
  vancouverSymphony,
  cecilGreenArtsHouse,
  centreForEatingDisorders,
  biltmoreCabaret,
  jazzyVancouver,
  stPaulsAnglican,
  roxyVancouver,
  
  // Original event scrapers
  vancouverMuseumEvents,
  artGalleryScraper,
  beerFestivalScraper,
  comedyEventsScraper,
  playlandPNE,
  richmondNightMarket,
  rogersArenaEvents,
  shipyardsNightMarket,
  specialMarketEvents,
  thunderbirdArena,
  ticketmasterEventScraper,
  vancouverCivicTheatres,
  vancouverCulturalEvents,
  vancouverFringeFestival,
  vancouverOutdoorEvents,
  vancouverSportsEvents,

  // New event scrapers
  vancouverComedyFest,
  bcEventCalendar,
  coastalJazzFestival,
  // Destination Vancouver Events scraper removed
  vanDusenEvents,
  vancouverChristmasMarket,
  vancouverFarmersMarkets,
  capilanoBridge,
  grouseMountainEvents,
  dragonBoatBC,
  beerFestivalEvents,
  iHeartRaves
];

/**
 * Run a specific scraper by name
 * @param {string} scraperName - Name of the scraper to run
 * @returns {Promise<Array>} Array of event objects
 */
async function runScraper(scraperName) {
  const scraper = scrapers.find(s => s.name.toLowerCase() === scraperName.toLowerCase());
  
  if (!scraper) {
    throw new Error(`Scraper '${scraperName}' not found`);
  }
  
  console.log(`Running scraper: ${scraper.name}`);
  return await scraper.scrape();
}

/**
 * Run all registered scrapers
 * @param {boolean} save - Whether to save events to the database
 * @returns {Promise<Object>} Results of each scraper run
 */
async function runAll(save = false) {
  const results = {};
  
  for (const scraper of scrapers) {
    try {
      console.log(`Running scraper: ${scraper.name}`);
      const events = await scraper.scrape();
      results[scraper.name] = {
        count: events.length,
        success: true,
        events: events
      };
      
      // Save to database if requested
      if (save && events.length > 0) {
        await saveEvents(events, scraper.name);
      }
    } catch (error) {
      console.error(`Error running scraper ${scraper.name}:`, error);
      results[scraper.name] = {
        count: 0,
        success: false,
        error: error.message
      };
    }
  }
  
  return results;
}

/**
 * Save events to the database, handling duplicates
 * @param {Array} events - Events to save
 * @param {string} source - Source of the events
 * @returns {Promise<Object>} Results of the save operation
 */
async function saveEvents(events, source) {
  let added = 0;
  let duplicates = 0;
  
  for (const eventData of events) {
    try {
      // Check for duplicate based on title + date + venue
      const existingEvent = await Event.findOne({
        name: eventData.title,
        startDate: eventData.startDate,
        'venue.name': eventData.venue.name
      });
      
      if (!existingEvent) {
        // Map scraper event format to database Event model
        const event = new Event({
          name: eventData.title,
          description: eventData.description || eventData.title,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          venue: eventData.venue,
          type: eventData.type,
          category: eventData.category,
          imageURL: eventData.imageURL,
          sourceURL: eventData.sourceURL,
          location: eventData.location,
          season: eventData.season,
          status: eventData.status,
          scrapedFrom: source
        });
        
        await event.save();
        added++;
      } else {
        duplicates++;
      }
    } catch (error) {
      console.error(`Error saving event ${eventData.title}:`, error);
    }
  }
  
  return { added, duplicates };
}

module.exports = {
  scrapers,
  runScraper,
  runAll,
  saveEvents,
};
