const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🍴 Scraping Assembly Chef Hall events...');
  const scraper = createUniversalScraper(
    'Assembly Chef Hall',
    'https://assemblychefshall.com/events',
    '317 Dundas St W, Toronto, ON M5T 1G4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
