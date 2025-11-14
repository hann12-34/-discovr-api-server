const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toronto Ca All events...');
  const scraper = createUniversalScraper(
    'Toronto Ca All',
    'https://www.toronto.ca/explore-enjoy/festivals-events',
    'City Hall, 100 Queen St W, Toronto, ON M5H 2N2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
