const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * Melbourne Scrapers - Cleaned (1 per venue)
 */

const scrape170russell = require('./170russell');
const scrapeBrownalley = require('./brownalley');
const scrapeCherry = require('./cherry');
const scrapeCorner = require('./corner');
const scrapeCroxton = require('./croxton');
const scrapeEsplanade = require('./esplanade');
const scrapeFedSquareEvents = require('./fed_square_events');
const scrapeForumMelbourne = require('./forumMelbourne');
const scrapeGrandPrixMelb = require('./grand_prix_melb');
const scrapeHifi = require('./hifi');
const scrapeHowler = require('./howler');
const scrapeMaxwatts = require('./maxwatts');
const scrapeMcgConcerts = require('./mcg_concerts');
const scrapeMelbourneComedyFest = require('./melbourne_comedy_fest');
const scrapeMoombaFestival = require('./moomba_festival');
const scrapeNightNoodleMarkets = require('./night_noodle_markets');
const scrapeNightcat = require('./nightcat');
const scrapeNorthcote = require('./northcote');
const scrapeOldbar = require('./oldbar');
const scrapePalais = require('./palais');
const scrapePrince = require('./prince');
const scrapeQueenVicMarketNight = require('./queen_vic_market_night');
const scrapeRevolver = require('./revolver');
const scrapeSpotted = require('./spotted');
const scrapeStKildaFestival = require('./st_kilda_festival');
const scrapeStaysgold = require('./staysgold');
const scrapeTote = require('./tote');
const scrapeWhiteNightMelb = require('./white_night_melb');
const scrapeWorkers = require('./workers');
const scrapeYarraville = require('./yarraville');
const scrapeOnyxMelbourne = require('./onyx_melbourne');
const scrapeSection8Melbourne = require('./section8_melbourne');
const scrapeDiscoverMelbourne = require('./discover_melbourne');
const scrapeAcmiMelbourne = require('./scrape-acmi-melbourne');
const scrapeNgvMelbourne = require('./scrape-ngv-melbourne');

const _rawExports = {
  scrape170russell,
  scrapeBrownalley,
  scrapeCherry,
  scrapeCorner,
  scrapeCroxton,
  scrapeEsplanade,
  scrapeFedSquareEvents,
  scrapeForumMelbourne,
  scrapeGrandPrixMelb,
  scrapeHifi,
  scrapeHowler,
  scrapeMaxwatts,
  scrapeMcgConcerts,
  scrapeMelbourneComedyFest,
  scrapeMoombaFestival,
  scrapeNightNoodleMarkets,
  scrapeNightcat,
  scrapeNorthcote,
  scrapeOldbar,
  scrapePalais,
  scrapePrince,
  scrapeQueenVicMarketNight,
  scrapeRevolver,
  scrapeSpotted,
  scrapeStKildaFestival,
  scrapeStaysgold,
  scrapeTote,
  scrapeWhiteNightMelb,
  scrapeWorkers,
  scrapeYarraville,
  scrapeOnyxMelbourne,
  scrapeSection8Melbourne,
  scrapeDiscoverMelbourne,
  scrapeAcmiMelbourne,
  scrapeNgvMelbourne,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
