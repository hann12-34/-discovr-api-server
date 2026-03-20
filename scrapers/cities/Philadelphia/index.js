const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * Philadelphia Scrapers - 60 scrapers
 */

const scrapeArdmore = require('./ardmore');
const scrapeBoot = require('./boot');
const scrapeBrooklynBowl = require('./brooklyn_bowl');
const scrapeCherryStreetPier = require('./cherry_street_pier');
const scrapeCoda = require('./coda');
const scrapeSilkCityPhilly = require('./silk_city_philly');
const scrapeDobbs = require('./dobbs');
const scrapeElectricFactory = require('./electric_factory');
const scrapeFillmorePhilly = require('./fillmore_philly');
const scrapeFoundry = require('./foundry');
const scrapeFranklinMusicHall = require('./franklin_music_hall');
const scrapeJohnny = require('./johnny');
const scrapeJohnnyBrendas = require('./johnny_brendas');
const scrapeKeswick = require('./keswick');
const scrapeKungFuNecktie = require('./kung_fu_necktie');
const scrapeMadeInAmerica = require('./made_in_america');
const scrapeMetPhilly = require('./met_philly');
const scrapeMilkboy = require('./milkboy');
const scrapeOrtliebs = require('./ortliebs');
const scrapePennsLanding = require('./penns_landing');
const scrapePhilly76ers = require('./philly_76ers');
const scrapePhillyEagles = require('./philly_eagles');
const scrapePhillyFlyers = require('./philly_flyers');
const scrapePhillyFolkFest = require('./philly_folk_fest');
const scrapePhillyLive = require('./philly_live');
const scrapePunchLinePhilly = require('./punch_line_philly');
const scrapeSellersville = require('./sellersville');
const scrapeTheatreExile = require('./theatre_exile');
const scrapeTheatreOfLiving = require('./theatre_of_living');
const scrapeTowerTheater = require('./tower_theater');
const scrapeUnderground = require('./underground');
const scrapeUnion = require('./union');
const scrapeUnionTransfer = require('./union_transfer');
const scrapeVoltage = require('./voltage');
const scrapeWalnutStreet = require('./walnut_street');
const scrapeWellsFargo = require('./wells_fargo');
const scrapeWorldCafeLive = require('./world_cafe_live');
const scrapeXfinityLive = require('./xfinity_live');
const scrapeNotoPhiladelphia = require('./noto_philadelphia');
const scrapeFranklinInstitute = require('./scrape-franklin-institute');
const scrapePhilamocaPhiladelphia = require('./scrape-philamoca-philadelphia');
const scrapeUndergroundArtsPhiladelphia = require('./scrape-underground-arts-philadelphia');

const _rawExports = {
  scrapeArdmore,
  scrapeBoot,
  scrapeBrooklynBowl,
  scrapeCherryStreetPier,
  scrapeCoda,
  scrapeSilkCityPhilly,
  scrapeDobbs,
  scrapeElectricFactory,
  scrapeFillmorePhilly,
  scrapeFoundry,
  scrapeFranklinMusicHall,
  scrapeJohnny,
  scrapeJohnnyBrendas,
  scrapeKeswick,
  scrapeKungFuNecktie,
  scrapeMadeInAmerica,
  scrapeMetPhilly,
  scrapeMilkboy,
  scrapeOrtliebs,
  scrapePennsLanding,
  scrapePhilly76ers,
  scrapePhillyEagles,
  scrapePhillyFlyers,
  scrapePhillyFolkFest,
  scrapePhillyLive,
  scrapePunchLinePhilly,
  scrapeSellersville,
  scrapeTheatreExile,
  scrapeTheatreOfLiving,
  scrapeTowerTheater,
  scrapeUnderground,
  scrapeUnion,
  scrapeUnionTransfer,
  scrapeVoltage,
  scrapeWalnutStreet,
  scrapeWellsFargo,
  scrapeWorldCafeLive,
  scrapeXfinityLive,
  scrapeNotoPhiladelphia,
  scrapeFranklinInstitute,
  scrapePhilamocaPhiladelphia,
  scrapeUndergroundArtsPhiladelphia,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
