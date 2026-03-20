const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * galway Scrapers - 30 scrapers
 */

const scrapeBaborKidsFest = require('./baboró_kids_fest');
// Removed: carbon - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeCuirtLiteraryFest = require('./cuirt_literary_fest');
// Removed: electric - ERR_CERT_AUTHORITY_INVALID
const scrapeGalwayArtsFest = require('./galway_arts_fest');
const scrapeGalwayChristmasMarket = require('./galway_christmas_market');
const scrapeGalwayComedyFest = require('./galway_comedy_fest');
const scrapeGalwayEarlyMusicFest = require('./galway_early_music_fest');
const scrapeGalwayFilmFleadh = require('./galway_film_fleadh');
const scrapeGalwayFoodFest = require('./galway_food_fest');
const scrapeGalwayGirlSesh = require('./galway_girl_sesh');
const scrapeGalwayHookersRegatta = require('./galway_hookers_regatta');
const scrapeGalwayMarketTrail = require('./galway_market_trail');
const scrapeGalwayNewYears = require('./galway_new_years');
const scrapeGalwayOysterFest = require('./galway_oyster_fest');
// Removed: galway_pride - ERR_TOO_MANY_REDIRECTS
const scrapeGalwayRaces = require('./galway_races');
const scrapeGalwayScienceTechFest = require('./galway_science_tech_fest');
const scrapeGalwaySessionsFest = require('./galway_sessions_fest');
// Removed: monroe_tavern - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeRoisiinDubh = require('./roisiinDubh');
// Removed: salomons - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeSalthillPromenadeEvents = require('./salthill_promenade_events');
// Removed: taaffes - dead URL (ERR_NAME_NOT_RESOLVED)
// Removed: the_kings_head - dead URL (ERR_NAME_NOT_RESOLVED)
// Removed: the_loft - dead URL (ERR_NAME_NOT_RESOLVED)
// Removed: the_quays - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeTownHallTheatre = require('./town_hall_theatre');
// Removed: dna_galway - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeGalwayTourismEvents = require('./galway_tourism_events');

const _rawExports = {
  scrapeBaborKidsFest,
  scrapeCuirtLiteraryFest,
  scrapeGalwayArtsFest,
  scrapeGalwayChristmasMarket,
  scrapeGalwayComedyFest,
  scrapeGalwayEarlyMusicFest,
  scrapeGalwayFilmFleadh,
  scrapeGalwayFoodFest,
  scrapeGalwayGirlSesh,
  scrapeGalwayHookersRegatta,
  scrapeGalwayMarketTrail,
  scrapeGalwayNewYears,
  scrapeGalwayOysterFest,
  scrapeGalwayRaces,
  scrapeGalwayScienceTechFest,
  scrapeGalwaySessionsFest,
  scrapeRoisiinDubh,
  scrapeSalthillPromenadeEvents,
  scrapeTownHallTheatre,
  scrapeGalwayTourismEvents
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
