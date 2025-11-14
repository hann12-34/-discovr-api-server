const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Garrison events...');
  const scraper = createUniversalScraper(
    'Garrison',
    'https://garrisontoronto.com/events',
    '1197 Dundas St W, Toronto, ON M6J 1X3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
