const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * San Francisco Scrapers - 13 scrapers
 */

const scrape1015folsom = require('./1015folsom');
const scrapeAugust = require('./august');
const scrapeBimbos = require('./bimbos');
const scrapeDnaLounge = require('./dnaLounge');
const scrapeFillmore = require('./fillmore');
const scrapeGreat = require('./great');
const scrapeIndependent = require('./theIndependentSF');
const scrapeSlims = require('./slimsSF');
const scrapeCafeDuNord = require('./cafeDuNordSF');
const scrapeGAMH = require('./greatAmericanMusicHallSF');
const scrapeChapel = require('./theChapelSF');
const scrapeCalAcademyOfSciences = require('./scrape-cal-academy-of-sciences');
const scrapeNoisePopSf = require('./scrape-noise-pop-sf');
const scrapeFifa2026 = require('./fifa2026');

const _rawExports = {
  scrape1015folsom,
  scrapeAugust,
  scrapeBimbos,
  scrapeDnaLounge,
  scrapeFillmore,
  scrapeGreat,
  scrapeIndependent,
  scrapeSlims,
  scrapeCafeDuNord,
  scrapeGAMH,
  scrapeChapel,
  scrapeCalAcademyOfSciences,
  scrapeNoisePopSf,
  scrapeFifa2026,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
