const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Dive Bar events...');
  const scraper = createUniversalScraper(
    'Dive Bar',
    'https://www.divebarto.com',
    '1631 Dundas St W, Toronto, ON M6K 1V2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
