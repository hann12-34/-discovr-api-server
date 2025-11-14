const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Red Sky Performance events...');
  const scraper = createUniversalScraper(
    'Red Sky Performance',
    'https://www.redskyperformance.com/upcoming-performances',
    '230 Carlaw Ave Suite 402, Toronto, ON M4M 2S1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
