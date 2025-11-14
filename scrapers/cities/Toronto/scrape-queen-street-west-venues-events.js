const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Queen Street West Venues events...');
  const scraper = createUniversalScraper(
    'Queen Street West Venues',
    'https://www.toronto.ca',
    '1087 Queen St W, Toronto, ON M6J 1H3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
