const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * newcastle Scrapers - 39 scrapers
 */

const scrapeBoilerShop = require('./boiler_shop');
// Removed: cosmic_ballroom - dead URL
// Removed: digital - timeout
const scrapeFreedomFestivalNewcastle = require('./freedom_festival_newcastle');
// Removed: head_of_steam - dead URL
// Removed: newcastle_beer_fest - dead URL
const scrapeNewcastleChristmasMarket = require('./newcastle_christmas_market');
// Removed: newcastle_city_hall - dead URL
// Removed: newcastle_comedy_fest - dead URL
const scrapeNewcastleFoodFest = require('./newcastle_food_fest');
const scrapeNewcastleFringe = require('./newcastle_fringe');
const scrapeNewcastleHoppings = require('./newcastle_hoppings');
// Removed: newcastle_jazz_fest - dead URL
const scrapeNewcastleMela = require('./newcastle_mela');
const scrapeNewcastleNewYears = require('./newcastle_new_years');
const scrapeNewcastlePride = require('./newcastle_pride');
const scrapeNewcastleScienceFest = require('./newcastle_science_fest');
// Removed: newcastle_vegan_fest - timeout
const scrapeNewcastleWinterFest = require('./newcastle_winter_fest');
// Removed: northumbria_students - timeout
const scrapeO2academy = require('./o2academy');
const scrapeOuseburnValleyFest = require('./ouseburn_valley_fest');
// Removed: riverside - dead URL
const scrapeSageGateshead = require('./sage_gateshead');
const scrapeStJamesPark = require('./st_james_park');
const scrapeTheCumberlandArms = require('./the_Cumberland_arms');
const scrapeTheCluny = require('./the_cluny');
const scrapeTheGlobe = require('./the_globe');
// Removed: the_jazz_cafe - dead URL
// Removed: the_loft - dead URL
const scrapeTheatreRoyal = require('./theatre_royal');
// Removed: think_tank - dead URL
const scrapeTimesSquareEvents = require('./times_square_events');
const scrapeTynesideCinema = require('./tyneside_cinema');
const scrapeUtilitaArena = require('./utilita_arena');
// Removed: world_hq - dead URL
// Removed: powerhouse_newcastle - SSL error
// Removed: basement_newcastle - dead URL
const scrapeBoilerShopV2 = require('./boiler_shop_v2');
// Removed: nx_newcastle - timeout
const scrapeO2AcademyNewcastleV2 = require('./o2_academy_v2');
// Removed: riverside_v2 - timeout
const scrapeThinkTankV2 = require('./think_tank_v2');
const scrapeClunyV2 = require('./cluny_v2');
const scrapeUtilitaArenaV2 = require('./utilita_arena_v2');
const scrapeNewcastleGateshead = require('./newcastle_gateshead');

const _rawExports = {
  scrapeBoilerShop,
  scrapeFreedomFestivalNewcastle,
  scrapeNewcastleChristmasMarket,
  scrapeNewcastleFoodFest,
  scrapeNewcastleFringe,
  scrapeNewcastleHoppings,
  scrapeNewcastleMela,
  scrapeNewcastleNewYears,
  scrapeNewcastlePride,
  scrapeNewcastleScienceFest,
  scrapeNewcastleWinterFest,
  scrapeO2academy,
  scrapeOuseburnValleyFest,
  scrapeSageGateshead,
  scrapeStJamesPark,
  scrapeTheCumberlandArms,
  scrapeTheCluny,
  scrapeTheGlobe,
  scrapeTheatreRoyal,
  scrapeTimesSquareEvents,
  scrapeTynesideCinema,
  scrapeUtilitaArena,
  scrapeBoilerShopV2,
  scrapeO2AcademyNewcastleV2,
  scrapeThinkTankV2,
  scrapeClunyV2,
  scrapeUtilitaArenaV2,
  scrapeNewcastleGateshead
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
