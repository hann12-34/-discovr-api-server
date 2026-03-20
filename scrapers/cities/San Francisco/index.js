const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * San Francisco Scrapers - 10 scrapers
 */

const scrape1015folsom = require('./1015folsom');
const scrapeAugust = require('./august');
const scrapeBimbos = require('./bimbos');
const scrapeDnaLounge = require('./dnaLounge');
const scrapeFillmore = require('./fillmore');
const scrapeGreat = require('./great');
const scrapeIndependent = require('./independent');
const scrapeSlims = require('./slims');
const scrapeCalAcademyOfSciences = require('./scrape-cal-academy-of-sciences');
const scrapeNoisePopSf = require('./scrape-noise-pop-sf');

const _rawExports = {
  scrape1015folsom,
  scrapeAugust,
  scrapeBimbos,
  scrapeDnaLounge,
  scrapeFillmore,
  scrapeGreat,
  scrapeIndependent,
  scrapeSlims,
  scrapeCalAcademyOfSciences,
  scrapeNoisePopSf,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
