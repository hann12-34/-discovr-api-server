const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Art Gallery of Ontario events...');
  const scraper = createUniversalScraper(
    'Art Gallery of Ontario',
    'https://www.toronto.ca/city-government/accountability-operations-customer-service/city-administration/city-managers-office/city-hall',
    '317 Dundas St W, Toronto, ON M5T 1G4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
