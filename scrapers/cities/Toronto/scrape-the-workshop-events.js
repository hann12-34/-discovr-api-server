const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🛠️ Scraping The Workshop events...');
  const scraper = createUniversalScraper(
    'The Workshop',
    'https://workshopto.com',
    '317 Dundas St W, Toronto, ON M5T 1G4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
