const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * Las Vegas Scrapers - 21 scrapers
 */

const scrapeBrooklyn = require('./brooklyn');
const scrapeEncore = require('./encore');
const scrapeHakkasan = require('./hakkasan');
const scrapeMarquee = require('./marquee');
const scrapeOmnia = require('./omnia');
const scrapeXs = require('./xs');
const scrapeZouk = require('./zouk');
const scrapeTao = require('./tao');
const scrapeJewel = require('./jewel');
const scrapeDrais = require('./drais');
const scrapeTmobileArena = require('./tmobile_arena');
const scrapeSphere = require('./sphere');
const scrapeMgmGrandGarden = require('./mgm_grand_garden');
const scrapeAllegiantStadium = require('./allegiant_stadium');
const scrapeResortsWorld = require('./resorts_world');
const scrapeWynn = require('./wynn');
const scrapeVenetian = require('./venetian');
const scrapeCaesarsColosseum = require('./caesars_colosseum');
const scrapeEdcVegas = require('./edc_vegas');
const scrapeLifeIsBeautiful = require('./life_is_beautiful');
const scrapeAllegiantStadiumNew = require('./scrape-allegiant-stadium');
const scrapeBrooklynBowlLasVegas = require('./scrape-brooklyn-bowl-las-vegas');
const scrapeResortsWorldTheatre = require('./scrape-resorts-world-theatre');
const scrapeTMobileArenaNew = require('./scrape-t-mobile-arena');

const _rawExports = {
  scrapeBrooklyn,
  scrapeEncore,
  scrapeHakkasan,
  scrapeMarquee,
  scrapeOmnia,
  scrapeXs,
  scrapeZouk,
  scrapeTao,
  scrapeJewel,
  scrapeDrais,
  scrapeTmobileArena,
  scrapeSphere,
  scrapeMgmGrandGarden,
  scrapeAllegiantStadium,
  scrapeResortsWorld,
  scrapeWynn,
  scrapeVenetian,
  scrapeCaesarsColosseum,
  scrapeEdcVegas,
  scrapeLifeIsBeautiful,
  scrapeAllegiantStadiumNew,
  scrapeBrooklynBowlLasVegas,
  scrapeResortsWorldTheatre,
  scrapeTMobileArenaNew,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
