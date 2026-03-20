const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * Auckland Scrapers - Working scrapers only
 * Last updated: Jan 2026
 * 
 * REMOVED (dead domains - ERR_NAME_NOT_RESOLVED):
 * - hollywood.js (hollywoodavondale.co.nz)
 * - ponsonby.js (ponsonbysocialclub.co.nz)
 * - whammy.js, whammy_bar.js (whammybar.co.nz)
 * - impala_auckland.js, impala_nightclub.js (impala.co.nz)
 * - roxy_auckland.js (theroxy.co.nz)
 * - fever_auckland.js (fever.net.nz)
 * - family_time_auckland.js (familytime.co.nz)
 * - laneway_festival_akl.js (SSL error)
 * - eventfinda_auckland.js (causes Node.js crash)
 */

const scrapeAucklandArtsFest = require('./auckland_arts_fest');
const scrapeAucklandLanternFest = require('./auckland_lantern_fest');
const scrapeAucklandPride = require('./auckland_pride');
const scrapeAucklandlive = require('./aucklandlive');
const scrapeCassette = require('./cassette');
const scrapeCivic = require('./civic');
const scrapeDepot = require('./depot');
const scrapeDiwaliAuckland = require('./diwali_auckland');
const scrapeGalatos = require('./galatos');
const scrapeKings = require('./kings');
const scrapeMatarikiFestAkl = require('./matariki_fest_akl');
const scrapeNeck = require('./neck');
const scrapePowerstation = require('./powerstation');
const scrapeStudio = require('./studio');
const scrapeCrownAuckland = require('./crown_auckland');
const scrapeBasementTheatre = require('./basement_theatre_akl');
const scrape1885Britomart = require('./1885_britomart');
const scrapeSparkArenaNew = require('./spark_arena');
const scrapeGalatosVenue = require('./galatos_venue');
const scrapeTuningFork = require('./tuning_fork');
const scrapeRnzbAuckland = require('./scrape-rnzb-auckland');

const _rawExports = {
  scrapeAucklandArtsFest,
  scrapeAucklandLanternFest,
  scrapeAucklandPride,
  scrapeAucklandlive,
  scrapeCassette,
  scrapeCivic,
  scrapeDepot,
  scrapeDiwaliAuckland,
  scrapeGalatos,
  scrapeKings,
  scrapeMatarikiFestAkl,
  scrapeNeck,
  scrapePowerstation,
  scrapeStudio,
  scrapeCrownAuckland,
  scrapeBasementTheatre,
  scrape1885Britomart,
  scrapeSparkArenaNew,
  scrapeGalatosVenue,
  scrapeTuningFork,
  scrapeRnzbAuckland,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
