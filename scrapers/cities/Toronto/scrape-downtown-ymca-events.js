const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🏋️ Scraping Downtown YMCA events...');
  const scraper = createUniversalScraper(
    'Downtown YMCA',
    'https://ymcagta.org/find-a-y/downtown-ymca',
    '317 Dundas St W, Toronto, ON M5T 1G4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
