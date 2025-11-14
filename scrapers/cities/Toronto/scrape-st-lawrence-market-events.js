const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping St Lawrence Market events...');
  const scraper = createUniversalScraper(
    'St Lawrence Market',
    'https://www.stlawrencemarket.com/events',
    '93 Front St E, Toronto, ON M5E 1C3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
