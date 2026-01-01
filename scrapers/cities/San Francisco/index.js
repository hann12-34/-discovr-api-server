/**
 * San Francisco Scrapers - 8 scrapers
 */

const scrape1015folsom = require('./1015folsom');
const scrapeAugust = require('./august');
const scrapeBimbos = require('./bimbos');
const scrapeDnaLounge = require('./dnaLounge');
const scrapeFillmore = require('./fillmore');
const scrapeGreat = require('./great');
const scrapeIndependent = require('./independent');
const scrapeSlims = require('./slims');

module.exports = {
  scrape1015folsom,
  scrapeAugust,
  scrapeBimbos,
  scrapeDnaLounge,
  scrapeFillmore,
  scrapeGreat,
  scrapeIndependent,
  scrapeSlims
};
