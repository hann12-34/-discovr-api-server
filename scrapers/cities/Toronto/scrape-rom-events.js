const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Royal Ontario Museum events...');
  const scraper = createUniversalScraper(
    'Royal Ontario Museum',
    'https://toronto.citynews.ca/entertainment/',
    '100 Queens Park, Toronto, ON M5S 2C6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
