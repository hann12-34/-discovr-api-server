const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Steady Cafe events...');
  const scraper = createUniversalScraper(
    'The Steady Cafe',
    'https://www.timeout.com/toronto/things-to-do/things-to-do-in-toronto-this-week',
    '1051 Bloor St W, Toronto, ON M6H 1M1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
